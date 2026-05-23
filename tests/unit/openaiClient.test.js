// tests/unit/openaiClient.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Verifies that extractPicksFromTranscript sends max_tokens, uses a 30-second
// AbortSignal per attempt, and retries once on 5xx before propagating.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractPicksFromTranscript } from '../../src/lib/openai.js';

// ── helpers ───────────────────────────────────────────────────────────────────

const SOURCE = { name: 'TestExpert', apiKey: 'sk-test' };
const GAMES  = ['KC @ BAL', 'PHI @ DAL'];

function pickResponse(picks = [{ selection: 'KC', team1: 'KC', team2: 'BAL',
  type: 'Spread', line: '-3', summary: 's', analysis: 'a', units: 2 }]) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify({ picks }) } }],
    }),
  };
}

function serverError(status = 503) {
  return { ok: false, status, json: async () => ({ error: { message: `HTTP ${status}` } }) };
}

// ── max_tokens ────────────────────────────────────────────────────────────────

describe('extractPicksFromTranscript — request shape', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(pickResponse()));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('includes max_tokens: 1500 in the request body', async () => {
    await extractPicksFromTranscript('transcript', SOURCE, GAMES);

    const [, init] = fetch.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.max_tokens).toBe(1500);
  });

  it('sends an AbortSignal with each request', async () => {
    await extractPicksFromTranscript('transcript', SOURCE, GAMES);

    const [, init] = fetch.mock.calls[0];
    expect(init.signal).toBeDefined();
    expect(typeof init.signal.aborted).toBe('boolean');
  });

  it('returns the picks array from a successful response', async () => {
    const picks = await extractPicksFromTranscript('transcript', SOURCE, GAMES);
    expect(Array.isArray(picks)).toBe(true);
    expect(picks[0].selection).toBe('KC');
  });
});

// ── 5xx retry ─────────────────────────────────────────────────────────────────

describe('extractPicksFromTranscript — 5xx retry', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('retries once on 503 and succeeds on second attempt', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(serverError(503))
      .mockResolvedValueOnce(pickResponse()),
    );

    const picks = await extractPicksFromTranscript('transcript', SOURCE, GAMES);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(picks[0].selection).toBe('KC');
  });

  it('does not make a third attempt after two 5xx responses', async () => {
    // Both attempts fail with 503 — second call returns the error JSON
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValue({ ok: false, status: 503,
        json: async () => ({ error: { message: 'Service Unavailable' } }) }),
    );

    await expect(extractPicksFromTranscript('transcript', SOURCE, GAMES))
      .rejects.toThrow('OpenAI Error: Service Unavailable');

    // MAX_RETRIES=1 means 2 total attempts, never 3
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('does not retry on a 4xx client error', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValue({ ok: false, status: 401,
        json: async () => ({ error: { message: 'Invalid API key' } }) }),
    );

    await expect(extractPicksFromTranscript('transcript', SOURCE, GAMES))
      .rejects.toThrow('OpenAI Error: Invalid API key');

    expect(fetch).toHaveBeenCalledTimes(1); // no retry for 4xx
  });
});

// ── timeout propagation ───────────────────────────────────────────────────────

describe('extractPicksFromTranscript — timeout', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('propagates AbortError when fetch times out', async () => {
    const abortErr = Object.assign(new Error('The operation was aborted'),
      { name: 'AbortError' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortErr));

    await expect(extractPicksFromTranscript('transcript', SOURCE, GAMES))
      .rejects.toMatchObject({ name: 'AbortError' });
  });
});
