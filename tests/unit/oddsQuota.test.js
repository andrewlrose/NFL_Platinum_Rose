/**
 * Unit tests for QUOTA-BUDGET fix.
 *
 * Verifies that:
 *   1. getOddsQuotaState() reads / resets state from localStorage correctly.
 *   2. fetchMultiBookOdds() writes quota state in all three paths:
 *        a. No proxy URL → isMock=true, fetch NOT called.
 *        b. Proxy URL + success + header → remaining set, isMock=false.
 *        c. Proxy URL + non-ok response → isMock=true (via catch).
 *        d. Proxy URL + network error → isMock=true (via catch).
 *
 * Run: npx vitest run tests/unit/oddsQuota.test.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── localStorage stub ────────────────────────────────────────────────────────
function makeLocalStorage() {
  const store = {};
  return {
    getItem:    (k)    => (k in store ? store[k] : null),
    setItem:    (k, v) => { store[k] = String(v); },
    removeItem: (k)    => { delete store[k]; },
    clear:      ()     => { Object.keys(store).forEach(k => delete store[k]); },
  };
}

const ls = makeLocalStorage();
vi.stubGlobal('localStorage', ls);

// ── Mutable apiConfig mock (controls ODDS_PROXY_URL per test) ───────────────
// vi.hoisted runs before imports so the variable is available when vi.mock fires.
const apiCfg = vi.hoisted(() => {
  const cfg = { _url: 'https://proxy.test', SUPABASE_ANON_KEY: 'sk-test' };
  Object.defineProperty(cfg, 'ODDS_PROXY_URL', {
    get() { return cfg._url; },
    enumerable: true,
    configurable: true,
  });
  return cfg;
});

vi.mock('../../src/lib/apiConfig.js', () => apiCfg);

// futures.js is pure math — use real impl (no mock needed)

import {
  QUOTA_LS_KEY,
  getOddsQuotaState,
  fetchMultiBookOdds,
} from '../../src/lib/enhancedOddsApi.js';

// ── helpers ──────────────────────────────────────────────────────────────────
const currentMonth = () => new Date().toISOString().slice(0, 7);

/** Build a minimal fake Response that fetch() resolves to. */
function fakeResponse(body, { ok = true, status = 200, headers = {} } = {}) {
  return {
    ok,
    status,
    headers: {
      get: (name) => headers[name.toLowerCase()] ?? null,
    },
    json: async () => body,
  };
}

beforeEach(() => {
  ls.clear();
  apiCfg._url = 'https://proxy.test'; // reset to a defined URL
  vi.restoreAllMocks();
  // Suppress console noise from the module under test.
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── getOddsQuotaState ────────────────────────────────────────────────────────
describe('getOddsQuotaState()', () => {
  it('returns default state when localStorage is empty', () => {
    const s = getOddsQuotaState();
    expect(s.remaining).toBeNull();
    expect(s.isMock).toBe(false);
    expect(s.month).toBe(currentMonth());
  });

  it('returns stored state when month matches', () => {
    ls.setItem(QUOTA_LS_KEY, JSON.stringify({
      remaining: 220,
      month: currentMonth(),
      isMock: false,
    }));
    const s = getOddsQuotaState();
    expect(s.remaining).toBe(220);
    expect(s.isMock).toBe(false);
  });

  it('resets to default when stored month differs from current', () => {
    ls.setItem(QUOTA_LS_KEY, JSON.stringify({
      remaining: 0,
      month: '2024-01',  // old month
      isMock: true,
    }));
    const s = getOddsQuotaState();
    expect(s.remaining).toBeNull();
    expect(s.isMock).toBe(false);
    expect(s.month).toBe(currentMonth());
  });

  it('returns default state when localStorage contains malformed JSON', () => {
    ls.setItem(QUOTA_LS_KEY, 'not-valid-json{{{');
    const s = getOddsQuotaState();
    expect(s.remaining).toBeNull();
    expect(s.isMock).toBe(false);
  });
});

// ── fetchMultiBookOdds — no proxy URL ────────────────────────────────────────
describe('fetchMultiBookOdds() — no ODDS_PROXY_URL', () => {
  it('sets isMock=true in quota state', async () => {
    apiCfg._url = undefined;
    await fetchMultiBookOdds();
    expect(getOddsQuotaState().isMock).toBe(true);
  });

  it('does NOT call global fetch', async () => {
    apiCfg._url = undefined;
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await fetchMultiBookOdds();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns an array of game objects (mock data)', async () => {
    apiCfg._url = undefined;
    const result = await fetchMultiBookOdds();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('home_team');
  });
});

// ── fetchMultiBookOdds — proxy URL defined, success ──────────────────────────
describe('fetchMultiBookOdds() — proxy success', () => {
  it('sets remaining from x-requests-remaining header and isMock=false', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      fakeResponse([], {
        ok: true,
        headers: { 'x-requests-remaining': '150' },
      })
    ));
    await fetchMultiBookOdds();
    const s = getOddsQuotaState();
    expect(s.remaining).toBe(150);
    expect(s.isMock).toBe(false);
  });

  it('sets remaining=null when x-requests-remaining header is absent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      fakeResponse([], { ok: true, headers: {} })
    ));
    await fetchMultiBookOdds();
    const s = getOddsQuotaState();
    expect(s.remaining).toBeNull();
    expect(s.isMock).toBe(false);
  });
});

// ── fetchMultiBookOdds — proxy URL defined, error paths ─────────────────────
describe('fetchMultiBookOdds() — proxy errors', () => {
  it('sets isMock=true on a non-ok response (e.g. 429 quota exhausted)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      fakeResponse({ message: 'quota exceeded' }, { ok: false, status: 429 })
    ));
    await fetchMultiBookOdds();
    expect(getOddsQuotaState().isMock).toBe(true);
  });

  it('sets isMock=true on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network failure')));
    await fetchMultiBookOdds();
    expect(getOddsQuotaState().isMock).toBe(true);
  });

  it('returns mock game data as fallback on error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network failure')));
    const result = await fetchMultiBookOdds();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty('home_team');
  });
});
