/**
 * Phase 7 (serving) -- /digest/* route helpers.
 *
 * Three exports:
 *   resolveDigestPath({ cfg, kind, id, slug, weekTag })
 *     Validates params, builds + asserts the absolute path. Throws
 *     { statusCode: 400 } on bad input -- never touches the FS.
 *
 *   sendDigestFile(request, reply, absPath, { extraHeaders })
 *     Reads the file; 404 if absent. Sets Content-Type, cache and
 *     security headers. Supports conditional GET via ETag (mtime+size).
 *     Phase 8 passes extraHeaders to layer share-only response headers
 *     without duplicating the file-read logic.
 *
 *   registerDigestRoutes(app, { cfg })
 *     Wires the 4 Tailscale-only GET routes onto the Fastify app.
 *     No auth preHandler -- network (127.0.0.1 + tailscale serve) is
 *     the only gate for /digest/*.
 *
 * Security model:
 *   - Param validation against fixed patterns blocks traversal at the
 *     input layer (no . / \ allowed in id/slug).
 *   - Containment assertion (path.resolve + startsWith) is defense-in-depth.
 *   - No user string is ever used in a path without passing validation first.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { config as defaultConfig } from './config.js';

// id / slug pattern: lowercase alphanum + hyphens, 1-64 chars.
// Matches slugify() output and UUID strings (lowercase hex + hyphens).
// Must NOT contain . / \ so path traversal is caught at pattern level.
const ID_SLUG_RE = /^[a-z0-9-]{1,64}$/;

// weekTag pattern: e.g. "2025-W5", "2026-W18".
const WEEK_TAG_RE = /^\d{4}-W\d{1,2}$/;

/**
 * Validate params and return the absolute on-disk path for the digest file.
 * Throws { statusCode: 400, error: 'bad_request', message } on any violation.
 * Never touches the filesystem.
 *
 * @param {{ cfg?: object, kind: string, id?: string, slug?: string, weekTag?: string }} opts
 * @returns {string} absolute path
 */
export function resolveDigestPath({ cfg = defaultConfig, kind, id, slug, weekTag } = {}) {
  const digestDir = path.resolve(cfg.digestDir);

  let candidate;

  switch (kind) {
    case 'episode': {
      if (!ID_SLUG_RE.test(id ?? '')) {
        throw { statusCode: 400, error: 'bad_request', message: 'invalid id' };
      }
      candidate = path.join(digestDir, 'episodes', `${id}.html`);
      break;
    }
    case 'expert': {
      if (!ID_SLUG_RE.test(slug ?? '')) {
        throw { statusCode: 400, error: 'bad_request', message: 'invalid slug' };
      }
      candidate = path.join(digestDir, 'experts', `${slug}.html`);
      break;
    }
    case 'expertWeek': {
      if (!ID_SLUG_RE.test(slug ?? '')) {
        throw { statusCode: 400, error: 'bad_request', message: 'invalid slug' };
      }
      if (!WEEK_TAG_RE.test(weekTag ?? '')) {
        throw { statusCode: 400, error: 'bad_request', message: 'invalid weekTag' };
      }
      candidate = path.join(digestDir, 'experts', slug, `${weekTag}.html`);
      break;
    }
    case 'weekly': {
      if (!WEEK_TAG_RE.test(weekTag ?? '')) {
        throw { statusCode: 400, error: 'bad_request', message: 'invalid weekTag' };
      }
      candidate = path.join(digestDir, 'weekly', `${weekTag}.html`);
      break;
    }
    default:
      throw { statusCode: 400, error: 'bad_request', message: 'unknown kind' };
  }

  // Containment assertion (defense-in-depth even though step 1 already
  // excludes . / \ from params).
  const abs = path.resolve(candidate);
  if (abs !== candidate || !abs.startsWith(digestDir + path.sep)) {
    throw { statusCode: 400, error: 'bad_request', message: 'path outside digest dir' };
  }

  return abs;
}

/**
 * Read the file at absPath and send it as an HTML response.
 * 404 if the file does not exist. Supports conditional GET via ETag.
 *
 * @param {object} request  Fastify request (for If-None-Match header)
 * @param {object} reply    Fastify reply
 * @param {string} absPath  absolute path returned by resolveDigestPath
 * @param {{ extraHeaders?: Record<string,string> }} [opts]
 */
export async function sendDigestFile(request, reply, absPath, { extraHeaders } = {}) {
  let stat;
  try {
    stat = await fs.stat(absPath);
  } catch {
    return reply.code(404).send({ error: 'not_found' });
  }

  // Weak ETag: hex(mtime) + '-' + hex(size). Cheap to compute; good enough
  // for a file that only changes when 7a re-renders it.
  const etag = `W/"${stat.mtimeMs.toString(16)}-${stat.size.toString(16)}"`;

  // Conditional GET -- avoids resending unchanged HTML over the tailnet.
  const ifNoneMatch = request.headers['if-none-match'];
  if (ifNoneMatch === etag) {
    return reply.code(304).send();
  }

  const html = await fs.readFile(absPath, 'utf8');

  reply
    .code(200)
    .header('Content-Type', 'text/html; charset=utf-8')
    .header('X-Content-Type-Options', 'nosniff')
    .header('Cache-Control', 'no-cache')
    .header('ETag', etag);

  if (extraHeaders) {
    for (const [key, val] of Object.entries(extraHeaders)) {
      reply.header(key, val);
    }
  }

  return reply.send(html);
}

/**
 * Wire the four Tailscale-only /digest/* routes onto the Fastify app.
 * No auth preHandler -- the network gate (127.0.0.1 + tailscale serve) is
 * sufficient for this private surface. /share/* (Phase 8) is the public surface.
 *
 * Fastify find-my-way parses e.g. '/digest/episodes/:id.html' so that the
 * ':id' param contains the bare id without the '.html' suffix.
 *
 * @param {object} app     Fastify instance
 * @param {{ cfg?: object }} [opts]
 */
export function registerDigestRoutes(app, { cfg = defaultConfig } = {}) {
  app.get('/digest/episodes/:id.html', async (request, reply) => {
    let abs;
    try {
      abs = resolveDigestPath({ cfg, kind: 'episode', id: request.params.id });
    } catch (err) {
      return reply.code(err.statusCode ?? 400).send({ error: err.error ?? 'bad_request', message: err.message });
    }
    return sendDigestFile(request, reply, abs);
  });

  app.get('/digest/experts/:slug.html', async (request, reply) => {
    let abs;
    try {
      abs = resolveDigestPath({ cfg, kind: 'expert', slug: request.params.slug });
    } catch (err) {
      return reply.code(err.statusCode ?? 400).send({ error: err.error ?? 'bad_request', message: err.message });
    }
    return sendDigestFile(request, reply, abs);
  });

  app.get('/digest/experts/:slug/:weekTag.html', async (request, reply) => {
    let abs;
    try {
      abs = resolveDigestPath({
        cfg,
        kind: 'expertWeek',
        slug: request.params.slug,
        weekTag: request.params.weekTag,
      });
    } catch (err) {
      return reply.code(err.statusCode ?? 400).send({ error: err.error ?? 'bad_request', message: err.message });
    }
    return sendDigestFile(request, reply, abs);
  });

  app.get('/digest/weekly/:weekTag.html', async (request, reply) => {
    let abs;
    try {
      abs = resolveDigestPath({ cfg, kind: 'weekly', weekTag: request.params.weekTag });
    } catch (err) {
      return reply.code(err.statusCode ?? 400).send({ error: err.error ?? 'bad_request', message: err.message });
    }
    return sendDigestFile(request, reply, abs);
  });
}
