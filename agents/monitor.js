#!/usr/bin/env node
/**
 * monitor.js — NFL Dashboard MonitorAgent (Tier-2)
 *
 * Checks pipeline health, Supabase connectivity, API rate limits,
 * and agent execution state. Writes a health report to .nfl/health.json.
 *
 * Triggered by: overnight.js or on-demand
 *
 * Health checks:
 *   1. Supabase: query a lightweight table to verify connectivity
 *   2. API keys: verify ODDS_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY are set
 *   3. Agent lock: check AGENT_LOCK.json for stale locks (>2h old)
 *   4. Last ingest: verify odds-ingest ran within expected window
 *   5. Task board: count In Progress tasks
 *
 * Exit codes:
 *   0 — all checks pass or non-critical failures only
 *   1 — critical failure (Supabase down, stale lock, etc.)
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const HEALTH_FILE = join(ROOT, '.nfl', 'health.json');
const LOCK_FILE = join(ROOT, 'AGENT_LOCK.json');

/** @typedef {{ name: string, status: 'ok'|'warn'|'error', message: string }} Check */

/** @returns {Check} */
function checkEnvKeys() {
  const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  const optional = ['ODDS_API_KEY', 'ANTHROPIC_API_KEY'];
  const missing = required.filter(k => !process.env[k]);
  const missingOptional = optional.filter(k => !process.env[k]);

  if (missing.length > 0) {
    return { name: 'env-keys', status: 'error', message: `Missing required: ${missing.join(', ')}` };
  }
  if (missingOptional.length > 0) {
    return { name: 'env-keys', status: 'warn', message: `Missing optional: ${missingOptional.join(', ')}` };
  }
  return { name: 'env-keys', status: 'ok', message: 'All keys present' };
}

/** @returns {Check} */
function checkAgentLock() {
  if (!existsSync(LOCK_FILE)) {
    return { name: 'agent-lock', status: 'ok', message: 'No lock file' };
  }
  try {
    const lock = JSON.parse(readFileSync(LOCK_FILE, 'utf8'));
    if (!lock.locked) {
      return { name: 'agent-lock', status: 'ok', message: 'Not locked' };
    }
    const age = (Date.now() - new Date(lock.acquired_at).getTime()) / 1000 / 60;
    if (age > 120) {
      return { name: 'agent-lock', status: 'error', message: `Stale lock: ${Math.round(age)}m old (locked by ${lock.agent})` };
    }
    return { name: 'agent-lock', status: 'warn', message: `Locked by ${lock.agent} for ${Math.round(age)}m` };
  } catch {
    return { name: 'agent-lock', status: 'warn', message: 'Could not parse lock file' };
  }
}

/** @returns {Check} */
function checkLastIngest() {
  const memFile = join(ROOT, '.nfl', 'memory.json');
  if (!existsSync(memFile)) {
    return { name: 'last-ingest', status: 'warn', message: 'No .nfl/memory.json' };
  }
  try {
    const mem = JSON.parse(readFileSync(memFile, 'utf8'));
    const lastRun = mem.last_ingest_run;
    if (!lastRun) {
      return { name: 'last-ingest', status: 'warn', message: 'last_ingest_run not set' };
    }
    const ageHours = (Date.now() - new Date(lastRun).getTime()) / 1000 / 3600;
    if (ageHours > 25) {
      return { name: 'last-ingest', status: 'warn', message: `Last ingest ${Math.round(ageHours)}h ago` };
    }
    return { name: 'last-ingest', status: 'ok', message: `Last ingest ${Math.round(ageHours)}h ago` };
  } catch {
    return { name: 'last-ingest', status: 'warn', message: 'Could not read memory.json' };
  }
}

/** @returns {Check} */
function checkTaskBoard() {
  const tb = join(ROOT, 'TASK_BOARD.md');
  if (!existsSync(tb)) return { name: 'task-board', status: 'warn', message: 'No TASK_BOARD.md' };
  const content = readFileSync(tb, 'utf8');
  const inProgress = (content.match(/^- \[/gm) || []).length;
  return { name: 'task-board', status: 'ok', message: `${inProgress} open task items` };
}

async function checkSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return { name: 'supabase', status: 'warn', message: 'Keys not set — skipping connectivity check' };
  }
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    const { error } = await sb.from('game_results').select('id').limit(1);
    if (error) {
      return { name: 'supabase', status: 'error', message: error.message };
    }
    return { name: 'supabase', status: 'ok', message: 'Connected' };
  } catch (err) {
    return { name: 'supabase', status: 'error', message: String(err) };
  }
}

async function main() {
  const checks = [
    checkEnvKeys(),
    checkAgentLock(),
    checkLastIngest(),
    checkTaskBoard(),
    await checkSupabase(),
  ];

  const errors = checks.filter(c => c.status === 'error');
  const warns = checks.filter(c => c.status === 'warn');
  const overallStatus = errors.length > 0 ? 'error' : warns.length > 0 ? 'warn' : 'ok';

  const report = {
    checked_at: new Date().toISOString(),
    overall: overallStatus,
    checks,
  };

  const healthDir = join(ROOT, '.nfl');
  const { mkdirSync } = await import('node:fs');
  mkdirSync(healthDir, { recursive: true });
  writeFileSync(HEALTH_FILE, JSON.stringify(report, null, 2), 'utf8');

  for (const c of checks) {
    const icon = c.status === 'ok' ? '✓' : c.status === 'warn' ? '⚠' : '✗';
    console.log(`${icon} [${c.name}] ${c.message}`);
  }
  console.log(`\nOverall: ${overallStatus} — ${errors.length} errors, ${warns.length} warnings`);
  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
