import Fastify from 'fastify';
import { config } from './config.js';
import { hmacGuard } from './hmac.js';
import {
  startRun,
  getRun,
  getLastRunSummary,
  getQueueDepth,
} from './runRegistry.js';
import { buildPipelineWorker, parsePipelineInput } from './pipelineWorker.js';

/**
 * Build a configured Fastify instance. Exposed as a function so tests can
 * spin up an isolated app per test.
 *
 * @param {object} [opts]
 * @param {string} [opts.hmacSecret]    override secret (for tests)
 * @param {object} [opts.logger]        Fastify logger config
 * @param {Function} [opts.worker]      inject a fake worker (for tests)
 * @param {Function} [opts.onRunComplete]
 *   Optional Phase 7a hook: called after a run reaches 'done'. Fail-soft --
 *   errors are logged but never flip the run to 'error'. Injected from
 *   server.js (real Supabase renderer) so this function stays sync and
 *   test-friendly.
 */
export function buildServer(opts = {}) {
  const hmacSecret = opts.hmacSecret ?? config.hmacSecret;
  // Worker can be injected by tests to skip spawning Python. Default routes
  // by input.mode (extract / transcribe / full).
  const worker = opts.worker ?? buildPipelineWorker();
  // Phase 7a re-render hook -- undefined in tests; wired by server.js in prod.
  const onRunComplete = opts.onRunComplete;

  const app = Fastify({
    logger: opts.logger ?? { level: config.nodeEnv === 'test' ? 'silent' : 'info' },
    bodyLimit: 1 * 1024 * 1024, // 1 MB; ingest payloads are tiny
  });

  // Capture raw body so HMAC can verify the original bytes the cron signed.
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (req, body, done) => {
      req.rawBody = body;
      if (body === '' || body == null) {
        done(null, {});
        return;
      }
      try {
        done(null, JSON.parse(body));
      } catch (err) {
        err.statusCode = 400;
        done(err, undefined);
      }
    },
  );

  app.get('/health', async () => {
    const last = getLastRunSummary();
    return {
      ok: true,
      service: 'nfl-podcast',
      version: '0.1.0',
      last_run_at: last.last_run_at,
      last_run_status: last.last_run_status,
      queue_depth: getQueueDepth(),
    };
  });

  const hmac = { preHandler: hmacGuard({ secret: hmacSecret }) };

  app.post('/ingest/run', hmac, async (request, reply) => {
    let input;
    try {
      input = parsePipelineInput(request.body);
    } catch (err) {
      return reply
        .code(err.statusCode ?? 400)
        .send({ error: 'bad_request', message: err.message });
    }
    const runId = startRun({ worker, input, onRunComplete });
    reply.code(202);
    return { run_id: runId, status: 'queued' };
  });

  app.get('/ingest/status/:run_id', hmac, async (request, reply) => {
    const run = getRun(request.params.run_id);
    if (!run) {
      return reply.code(404).send({ error: 'run_not_found' });
    }
    return run;
  });

  for (const digestPath of [
    '/digest/episodes/:id.html',
    '/digest/experts/:slug.html',
    '/digest/experts/:slug/:weekTag.html',
    '/digest/weekly/:weekTag.html',
  ]) {
    app.get(digestPath, async (_req, reply) =>
      reply.code(501).send({ error: 'not_implemented', phase: 7 }),
    );
  }

  app.get('/share/*', async (_req, reply) =>
    reply.code(501).send({ error: 'not_implemented', phase: 8 }),
  );

  app.get('/api/transcript/:id', async (_req, reply) =>
    reply.code(501).send({ error: 'not_implemented', phase: 3 }),
  );

  return app;
}
