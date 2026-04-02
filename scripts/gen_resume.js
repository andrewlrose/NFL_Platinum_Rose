#!/usr/bin/env node
/**
 * gen_resume.js — Auto-generates the canonical Platinum Rose NFL resume command.
 *
 * Usage:  node scripts/gen_resume.js
 *    or:  npm run resume
 *
 * Prints a ready-to-paste resume command in the Gen-4 format:
 *   "Resume Platinum Rose NFL. HEAD = {commit} ({branch}). {state line}. Next: {task}."
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

function run(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

// ── Git info ─────────────────────────────────────────────────────────────────
const commit = run('git rev-parse --short HEAD') ?? 'unknown';
const branch = run('git branch --show-current') ?? 'main';
const dirty  = (run('git status --porcelain') ?? '') !== '';
const commitMsg = run('git log -1 --format=%s') ?? '';

// ── Test count (last vitest/playwright run) ──────────────────────────────────
let testCount = null;
const handoffPath = path.join(ROOT, 'HANDOFF_PROMPT.md');

// Try to extract test count from HANDOFF_PROMPT.md
if (fs.existsSync(handoffPath)) {
  const hp = fs.readFileSync(handoffPath, 'utf8');
  const m = hp.match(/Suite[:\s]+(\d{1,4})\/\1/i) ??
            hp.match(/(\d{1,4})\/\1\s+(?:tests?\s+)?passing/i) ??
            hp.match(/Tests?:\s+(\d{1,4})/i);
  if (m) testCount = m[1];
}

// ── Next task: first open item from TASK_BOARD.md ────────────────────────────
let nextTask = null;
const taskBoardPath = path.join(ROOT, 'TASK_BOARD.md');
if (fs.existsSync(taskBoardPath)) {
  const tb = fs.readFileSync(taskBoardPath, 'utf8');
  const openMatch = tb.match(/[-*]\s+\[ \]\s+(.+)/);
  if (openMatch) nextTask = openMatch[1].trim();
}

// ── State line: from HANDOFF_PROMPT.md ───────────────────────────────────────
let stateLine = null;
if (fs.existsSync(handoffPath)) {
  const hp = fs.readFileSync(handoffPath, 'utf8');
  const stateMatch =
    hp.match(/^(?:Last|S\d+\s+done)[:\s—–-]+([^\n]{10,120})/m) ??
    hp.match(/##\s+Current State\s*\n+([^\n]{10,120})/i);
  if (stateMatch) stateLine = stateMatch[1].trim().replace(/\.$/, '');
}

// ── Compose the resume command ────────────────────────────────────────────────
const dirtyNote = dirty ? ' (UNCOMMITTED CHANGES — commit before starting)' : '';
const commitRef = `HEAD = ${commit} (${branch})${dirtyNote}`;
const testRef   = testCount ? `Suite: ${testCount}/${testCount}.` : '';
const stateRef  = stateLine ?? `Last commit: "${commitMsg}"`;
const nextRef   = nextTask  ? `Next: ${nextTask}.` : 'Next: check TASK_BOARD.md.';

const resumeCommand =
  `Resume Platinum Rose NFL. ${commitRef}. ${testRef} ${stateRef}. ${nextRef} Read HANDOFF_PROMPT.md for full context before touching any file.`
  .replace(/\s{2,}/g, ' ');

// ── Output ────────────────────────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('  PLATINUM ROSE NFL — Resume Command');
console.log('╚══════════════════════════════════════════════════════════════╝\n');
console.log(resumeCommand);
console.log('\n── Details ──────────────────────────────────────────────────────');
console.log(`  Branch:  ${branch}`);
console.log(`  Commit:  ${commit}  ${dirty ? '⚠️  DIRTY TREE' : '✓ clean'}`);
if (testCount) console.log(`  Tests:   ${testCount}/${testCount}`);
if (nextTask)  console.log(`  Next:    ${nextTask}`);
console.log('─────────────────────────────────────────────────────────────────\n');

if (dirty) {
  console.log('⚠️  You have uncommitted changes. Run the session-close sequence first:');
  console.log('   git add -A');
  console.log('   git commit -m "S{N}: <description>"');
  console.log('   git push origin main\n');
}
