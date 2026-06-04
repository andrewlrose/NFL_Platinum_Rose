/**
 * Phase 7 (serving) tests (spec section 10).
 *
 * All tests are offline + Windows-friendly:
 *   - buildServer injected with cfg.digestDir pointing at os.tmpdir() scratch
 *   - Fixture HTML files pre-written before each test group that needs them
 *   - No Supabase, no real network, no Python
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { buildServer } from '../src/app.js';
import { resolveDigestPath } from '../src/digest.js';

const SECRET = 'test-secret-digest';

// Fixture HTML we write to disk before the serving tests.
const FIXTURE_HTML = '<html><body><h1>Test Episode</h1></body></html>';

let tmpDir;
let app;

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nfl-digest-serve-'));

  // Pre-write fixture files that serving tests expect to find.
  await fs.mkdir(path.join(tmpDir, 'episodes'), { recursive: true });
  await fs.mkdir(path.join(tmpDir, 'experts', 'sharp-sports'), { recursive: true });
  await fs.mkdir(path.join(tmpDir, 'weekly'), { recursive: true });

  await fs.writeFile(path.join(tmpDir, 'episodes', 'ep-abc.html'), FIXTURE_HTML, 'utf8');
  await fs.writeFile(path.join(tmpDir, 'experts', 'sharp-sports.html'), FIXTURE_HTML, 'utf8');
  await fs.writeFile(path.join(tmpDir, 'experts', 'sharp-sports', '2025-W5.html'), FIXTURE_HTML, 'utf8');
  await fs.writeFile(path.join(tmpDir, 'weekly', '2025-W5.html'), FIXTURE_HTML, 'utf8');
  // UUID-named episode
  await fs.writeFile(
    path.join(tmpDir, 'episodes', '550e8400-e29b-41d4-a716-446655440000.html'),
    FIXTURE_HTML,
    'utf8',
  );

  app = buildServer({
    hmacSecret: SECRET,
    logger: false,
    cfg: { digestDir: tmpDir },
  });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// 1. Existing fixture file returns 200 with correct content-type and body.
describe('200 -- existing fixture file', () => {
  it('GET /digest/episodes/ep-abc.html returns 200 + text/html + correct body', async () => {
    const res = await app.inject({ method: 'GET', url: '/digest/episodes/ep-abc.html' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.body).toBe(FIXTURE_HTML);
  });

  it('sets X-Content-Type-Options: nosniff and Cache-Control: no-cache', async () => {
    const res = await app.inject({ method: 'GET', url: '/digest/episodes/ep-abc.html' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cache-control']).toBe('no-cache');
  });
});

// 2. Missing file (valid params, not yet rendered) returns 404.
describe('404 -- valid params, file not rendered', () => {
  it('GET /digest/episodes/not-rendered returns 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/digest/episodes/not-rendered.html' });
    expect(res.statusCode).toBe(404);
  });

  it('GET /digest/weekly/2025-W99 returns 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/digest/weekly/2025-W99.html' });
    expect(res.statusCode).toBe(404);
  });
});

// 3. Bad param shapes return 400.
describe('400 -- bad param shapes', () => {
  it('uppercase id returns 400', async () => {
    const res = await app.inject({ method: 'GET', url: '/digest/episodes/Bad_Id.html' });
    expect(res.statusCode).toBe(400);
  });

  it('weekTag without W prefix returns 400', async () => {
    // "2026-13" lacks the "W" prefix required by /^\d{4}-W\d{1,2}$/
    const res = await app.inject({ method: 'GET', url: '/digest/weekly/2026-13.html' });
    expect(res.statusCode).toBe(400);
  });

  it('expertWeek with invalid weekTag returns 400', async () => {
    const res = await app.inject({ method: 'GET', url: '/digest/experts/sharp-sports/2026-WX.html' });
    expect(res.statusCode).toBe(400);
  });
});

// 4. Traversal attempts return 400 -- never read outside digestDir.
describe('400 -- traversal defense (load-bearing)', () => {
  it('resolveDigestPath rejects id with dots directly', () => {
    expect(() =>
      resolveDigestPath({ cfg: { digestDir: tmpDir }, kind: 'episode', id: '../etc/passwd' }),
    ).toThrow(expect.objectContaining({ statusCode: 400 }));
  });

  it('resolveDigestPath rejects slug with slash', () => {
    expect(() =>
      resolveDigestPath({ cfg: { digestDir: tmpDir }, kind: 'expert', slug: 'a/b' }),
    ).toThrow(expect.objectContaining({ statusCode: 400 }));
  });

  it('URL-encoded traversal via inject returns 400 or Fastify rejects routing', async () => {
    // Fastify decodes %2e to '.'; '.' fails the ^[a-z0-9-]{1,64}$ pattern.
    // Some variants may be caught by find-my-way before the handler; either
    // 400 or 404 is acceptable as long as it is NOT 200.
    const res = await app.inject({ method: 'GET', url: '/digest/episodes/..%2fetc%2fpasswd.html' });
    expect(res.statusCode).not.toBe(200);
  });
});

// 5. UUID id resolves correctly -- param does not include .html suffix.
describe(':id.html param parsing -- UUID id', () => {
  it('UUID-named episode file returns 200', async () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    const res = await app.inject({ method: 'GET', url: `/digest/episodes/${uuid}.html` });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe(FIXTURE_HTML);
  });
});

// 6. expertWeek two-param route resolves experts/<slug>/<weekTag>.html.
describe('expertWeek two-param route', () => {
  it('GET /digest/experts/sharp-sports/2025-W5.html returns 200', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/digest/experts/sharp-sports/2025-W5.html',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe(FIXTURE_HTML);
  });
});

// 7. Conditional GET -- second request with If-None-Match returns 304.
describe('conditional GET (ETag / 304)', () => {
  it('first request returns ETag; second with matching If-None-Match returns 304', async () => {
    const first = await app.inject({ method: 'GET', url: '/digest/experts/sharp-sports.html' });
    expect(first.statusCode).toBe(200);
    const etag = first.headers['etag'];
    expect(etag).toBeTruthy();

    const second = await app.inject({
      method: 'GET',
      url: '/digest/experts/sharp-sports.html',
      headers: { 'if-none-match': etag },
    });
    expect(second.statusCode).toBe(304);
    expect(second.body).toBe('');
  });
});

// 8. No auth header required -- Tailscale is the gate, not the app.
describe('no-auth access', () => {
  it('request with no Authorization header returns 200', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/digest/episodes/ep-abc.html',
      headers: {}, // explicitly no auth
    });
    expect(res.statusCode).toBe(200);
  });
});
