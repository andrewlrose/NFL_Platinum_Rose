#!/usr/bin/env node
/**
 * session-end.js — NFL_Dashboard
 *
 * Stop hook — fires at end of every Claude Code session.
 * Appends a session log entry to .nfl/session-log.jsonl.
 *
 * Exit codes:
 *   0 — always (non-blocking)
 */

import { existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKSPACE_ROOT = join(__dirname, '..', '..');

if (process.env.NFL_SKIP_HOOKS === 'true' || process.env.CI === 'true') {
  process.exit(0);
}

const LOG_DIR = join(WORKSPACE_ROOT, '.nfl');
const LOG_FILE = join(LOG_DIR, 'session-log.jsonl');

async function readStdinPayload() {
  return new Promise((resolve) => {
    let data = '';
    const timeout = setTimeout(() => resolve({}), 2000);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      clearTimeout(timeout);
      try { resolve(JSON.parse(data)); } catch { resolve({}); }
    });
    process.stdin.on('error', () => { clearTimeout(timeout); resolve({}); });
  });
}

function extractToolCounts(payload) {
  const counts = {};
  const transcript = payload?.transcript ?? [];
  for (const turn of transcript) {
    const toolUse = turn?.content?.filter?.(c => c?.type === 'tool_use') ?? [];
    for (const tool of toolUse) {
      if (tool?.name) counts[tool.name] = (counts[tool.name] ?? 0) + 1;
    }
  }
  return counts;
}

function extractEditedFiles(payload) {
  const files = new Set();
  const transcript = payload?.transcript ?? [];
  for (const turn of transcript) {
    const toolUse = turn?.content?.filter?.(c => c?.type === 'tool_use') ?? [];
    for (const tool of toolUse) {
      if (['Write', 'Edit', 'create_file', 'replace_string_in_file'].includes(tool?.name)) {
        const fp = tool?.input?.file_path ?? tool?.input?.filePath ?? tool?.input?.path;
        if (fp) {
          try {
            const rel = relative(WORKSPACE_ROOT, fp);
            if (!rel.startsWith('..')) files.add(rel.replace(/\\/g, '/'));
          } catch { /* skip */ }
        }
      }
    }
  }
  return [...files];
}

function estimateDuration(payload) {
  const turns = (payload?.transcript ?? []).length;
  if (turns <= 10) return 'short';
  if (turns <= 30) return 'medium';
  return 'long';
}

async function main() {
  const payload = await readStdinPayload();
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
  appendFileSync(
    LOG_FILE,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      files_edited: extractEditedFiles(payload),
      tool_calls: extractToolCounts(payload),
      session_duration_hint: estimateDuration(payload),
    }) + '\n',
    'utf8',
  );
}

main().catch(() => process.exit(0));
