// Pipeline workers — invoke Python sub-agents and stash summaries on the
// run object. Each builder returns a function compatible with
// runRegistry.startRun's `worker` argument and is dependency-injected so
// tests can swap the runner for a fake.
//
// Three modes are supported on /ingest/run, selected by request body shape:
//   - { transcript_path, episode_id, ... }                   → extract only
//   - { audio_path,      episode_id, ... }                   → transcribe only
//   - { audio_path,      episode_id, ..., pipeline:'full' }  → transcribe → extract

import { config } from './config.js';
import { runPython } from './pythonRunner.js';

/**
 * @typedef {object} PipelineInput
 * @property {'extract'|'transcribe'|'full'} mode  selected by parsePipelineInput
 * @property {string} [transcript_path]    required for mode='extract'
 * @property {string} [audio_path]         required for mode='transcribe'|'full'
 * @property {string|number} episode_id    Supabase episode id (string or numeric)
 * @property {string} [model]              override OLLAMA_MODEL (extract step)
 * @property {string} [ollama_url]         override OLLAMA_BASE_URL (extract step)
 * @property {string} [whisper_model]      override WHISPER_MODEL (transcribe step)
 * @property {string} [whisper_model_dir]  override WHISPER_MODEL_DIR
 * @property {string} [transcript_dir]     override NFL_TRANSCRIPT_DIR
 */

/**
 * Validate an /ingest/run body. Throws Error with .statusCode=400 on bad
 * input so the route handler can convert to a 400 response.
 *
 * @param {unknown} body
 * @returns {PipelineInput}
 */
export function parsePipelineInput(body) {
  if (!body || typeof body !== 'object') {
    const err = new Error('body must be a JSON object');
    err.statusCode = 400;
    throw err;
  }
  const {
    transcript_path,
    audio_path,
    episode_id,
    model,
    ollama_url,
    whisper_model,
    whisper_model_dir,
    transcript_dir,
    pipeline,
  } = body;

  if (
    episode_id === undefined ||
    episode_id === null ||
    (typeof episode_id !== 'string' && typeof episode_id !== 'number')
  ) {
    const err = new Error('episode_id is required (string or number)');
    err.statusCode = 400;
    throw err;
  }

  const hasTranscript = typeof transcript_path === 'string' && transcript_path.length > 0;
  const hasAudio = typeof audio_path === 'string' && audio_path.length > 0;

  if (!hasTranscript && !hasAudio) {
    const err = new Error('one of transcript_path or audio_path is required');
    err.statusCode = 400;
    throw err;
  }
  if (hasTranscript && hasAudio) {
    const err = new Error(
      'provide either transcript_path or audio_path, not both',
    );
    err.statusCode = 400;
    throw err;
  }

  let mode;
  if (hasTranscript) {
    mode = 'extract';
  } else if (pipeline === 'transcribe') {
    mode = 'transcribe';
  } else {
    // Default for audio_path inputs is the full chain.
    mode = 'full';
  }

  return {
    mode,
    transcript_path: hasTranscript ? transcript_path : undefined,
    audio_path: hasAudio ? audio_path : undefined,
    episode_id,
    model,
    ollama_url,
    whisper_model,
    whisper_model_dir,
    transcript_dir,
  };
}

/**
 * Build the Phase 4 worker. Returns a function compatible with
 * runRegistry.startRun's `worker` argument.
 *
 * @param {object} [deps]
 * @param {(opts: object) => Promise<{json: object}>} [deps.runner]
 *   override the python runner (used by tests)
 * @param {object} [deps.cfg]   override config (used by tests)
 */
export function buildPhase4Worker(deps = {}) {
  const runner = deps.runner ?? runPython;
  const cfg = deps.cfg ?? config;

  /**
   * @param {object} run     the run object (mutated in place)
   * @param {PipelineInput} input
   */
  return async function phase4Worker(run, input) {
    const args = [
      '-m', 'nfl_podcast.extract',
      '--transcript', input.transcript_path,
      '--episode-id', String(input.episode_id),
      '--ollama-url', input.ollama_url ?? cfg.ollamaBaseUrl,
      '--model', input.model ?? cfg.ollamaModel,
    ];
    const result = await runner({
      executable: cfg.pythonExecutable,
      cwd: cfg.pythonCwd,
      args,
      env: {
        OLLAMA_BASE_URL: input.ollama_url ?? cfg.ollamaBaseUrl,
        OLLAMA_MODEL: input.model ?? cfg.ollamaModel,
      },
    });
    const json = result.json ?? {};
    run.stats = {
      phase: 4,
      episode_id: input.episode_id,
      model: json.model,
      chunks: json.chunks,
      pick_count: Array.isArray(json.picks) ? json.picks.length : 0,
      dropped_count: Array.isArray(json.dropped) ? json.dropped.length : 0,
      extraction_quality_score: json.extraction_quality_score,
      fail_ratio: json.fail_ratio,
      needs_cloud_fallback: json.needs_cloud_fallback === true,
      duration_ms: result.duration_ms,
    };
    // Keep the full payload available on the run (handy for debug GETs).
    run.result = json;
  };
}

/**
 * Build the Phase 3 worker. Spawns ``python -m nfl_podcast.transcribe`` and
 * stores summary stats (txt path, duration, segment count) on the run.
 *
 * @param {object} [deps]
 * @param {(opts: object) => Promise<{json: object, duration_ms?: number}>} [deps.runner]
 * @param {object} [deps.cfg]
 */
export function buildPhase3Worker(deps = {}) {
  const runner = deps.runner ?? runPython;
  const cfg = deps.cfg ?? config;

  return async function phase3Worker(run, input) {
    const json = await transcribeStep(run, input, { runner, cfg });
    // Phase-3-only mode: stop here; expose the txt path for chained calls.
    run.stats = {
      phase: 3,
      episode_id: input.episode_id,
      model: json.model,
      audio_duration_sec: json.audio_duration_sec,
      chunked: json.chunked === true,
      segment_count: json.segment_count,
      transcript_path: json.txt,
      segments_json_path: json.segments_json,
      duration_ms: json._duration_ms,
    };
    run.result = json;
  };
}

/**
 * Build the full-pipeline worker. Runs Phase 3 then Phase 4 sequentially,
 * feeding the produced transcript_path into the extractor. Stats include
 * both phases under ``run.stats.phase3`` / ``run.stats.phase4`` plus a
 * top-level ``pick_count`` / ``extraction_quality_score`` for convenience.
 */
export function buildFullPipelineWorker(deps = {}) {
  const runner = deps.runner ?? runPython;
  const cfg = deps.cfg ?? config;

  return async function fullPipelineWorker(run, input) {
    const transcribeJson = await transcribeStep(run, input, { runner, cfg });
    const transcriptPath = transcribeJson.txt;
    if (!transcriptPath) {
      throw new Error(
        'transcribe step did not return a txt path; cannot continue to extract',
      );
    }
    const extractRun = { id: run.id, stats: {} };
    const phase4 = buildPhase4Worker({ runner, cfg });
    await phase4(extractRun, {
      ...input,
      transcript_path: transcriptPath,
    });
    run.stats = {
      phase: 'full',
      episode_id: input.episode_id,
      pick_count: extractRun.stats.pick_count,
      extraction_quality_score: extractRun.stats.extraction_quality_score,
      needs_cloud_fallback: extractRun.stats.needs_cloud_fallback,
      transcript_path: transcriptPath,
      audio_duration_sec: transcribeJson.audio_duration_sec,
      phase3: {
        model: transcribeJson.model,
        segment_count: transcribeJson.segment_count,
        chunked: transcribeJson.chunked === true,
        duration_ms: transcribeJson._duration_ms,
      },
      phase4: extractRun.stats,
    };
    run.result = {
      transcribe: transcribeJson,
      extract: extractRun.result,
    };
  };
}

/**
 * Route an /ingest/run input to the correct worker based on ``input.mode``.
 * Returns a function with the standard ``(run, input)`` signature.
 */
export function buildPipelineWorker(deps = {}) {
  const phase3 = buildPhase3Worker(deps);
  const phase4 = buildPhase4Worker(deps);
  const full = buildFullPipelineWorker(deps);
  return async function pipelineWorker(run, input) {
    if (input.mode === 'extract') return phase4(run, input);
    if (input.mode === 'transcribe') return phase3(run, input);
    if (input.mode === 'full') return full(run, input);
    throw new Error(`unknown pipeline mode: ${input.mode}`);
  };
}

// ── Internal ────────────────────────────────────────────────────────────────

async function transcribeStep(_run, input, { runner, cfg }) {
  const args = [
    '-m', 'nfl_podcast.transcribe',
    '--audio', input.audio_path,
    '--episode-id', String(input.episode_id),
    '--out-dir', input.transcript_dir ?? cfg.transcriptDir,
    '--model', input.whisper_model ?? cfg.whisperModel,
    '--model-dir', input.whisper_model_dir ?? cfg.whisperModelDir,
  ];
  const result = await runner({
    executable: cfg.pythonExecutable,
    cwd: cfg.pythonCwd,
    args,
    env: {
      WHISPER_MODEL: input.whisper_model ?? cfg.whisperModel,
      WHISPER_MODEL_DIR: input.whisper_model_dir ?? cfg.whisperModelDir,
      NFL_TRANSCRIPT_DIR: input.transcript_dir ?? cfg.transcriptDir,
    },
    // Whisper on CPU for a 60-min file can take 15-30 minutes.
    timeoutMs: 60 * 60 * 1000,
  });
  const json = result.json ?? {};
  // Stash the runner's own duration so callers can include it in stats.
  json._duration_ms = result.duration_ms;
  return json;
}
