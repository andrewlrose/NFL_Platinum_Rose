// HMAC validation for /ingest/* endpoints.
//
// The GHA cron job signs the raw request body with a shared secret and sends
// the result as `X-NFL-Signature: sha256=<hex>`. The server recomputes the
// digest over the raw body and rejects on mismatch.

import crypto from 'node:crypto';

const HEADER = 'x-nfl-signature';
const PREFIX = 'sha256=';

/**
 * Compute the canonical signature for a payload.
 * @param {string} secret
 * @param {Buffer|string} payload  raw request body
 * @returns {string}  e.g. "sha256=abc123..."
 */
export function signPayload(secret, payload) {
  const buf = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf8');
  const hex = crypto.createHmac('sha256', secret).update(buf).digest('hex');
  return PREFIX + hex;
}

/**
 * Constant-time compare two signature strings of equal length.
 */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * Fastify preHandler that enforces HMAC for the route it's attached to.
 * Requires the raw body to be present on `request.rawBody` (configured in
 * server.js via Fastify's `addContentTypeParser`).
 *
 * @param {object} opts
 * @param {string} opts.secret  shared secret
 * @returns Fastify preHandler
 */
export function hmacGuard({ secret }) {
  return async function preHandler(request, reply) {
    const provided = request.headers[HEADER];
    if (!provided || typeof provided !== 'string') {
      return reply.code(401).send({ error: 'missing_signature' });
    }
    const raw = request.rawBody ?? '';
    const expected = signPayload(secret, raw);
    if (!safeEqual(provided, expected)) {
      return reply.code(401).send({ error: 'bad_signature' });
    }
  };
}
