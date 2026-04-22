#!/usr/bin/env node
/**
 * quality-gate.js — NFL Dashboard
 * PostToolUse hook — fires after every Edit or Write tool call.
 * Runs ESLint on the edited JS/JSX file (non-blocking).
 *
 * Exit codes:
 *   0 — always (non-blocking quality signal)
 */

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

if (process.env.NFL_SKIP_HOOKS === 'true') {
  process.exit(0);
}

const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();

let input;
try {
  const raw = readFileSync('/dev/stdin', 'utf8').trim();
  input = raw ? JSON.parse(raw) : {};
} catch {
  process.exit(0);
}

const filePath = input?.tool_input?.file_path
  ?? input?.tool_input?.path
  ?? input?.tool_input?.filePath
  ?? null;

if (!filePath) process.exit(0);
if (!/\.(js|jsx)$/.test(filePath)) process.exit(0);

const absPath = path.isAbsolute(filePath)
  ? filePath
  : path.join(PROJECT_ROOT, filePath);

try {
  const result = execSync(
    `npx eslint "${absPath}" --max-warnings 0 --format compact 2>&1`,
    { cwd: PROJECT_ROOT, encoding: 'utf8', stdio: 'pipe' }
  );
  if (result.trim()) {
    console.warn('\n⚠️  NFL HOOK — ESLint issues in', filePath);
    console.warn(result.trim().slice(0, 2000));
  }
} catch (err) {
  const output = err.stdout ?? err.stderr ?? '';
  if (output.trim()) {
    console.warn('\n⚠️  NFL HOOK — ESLint found issues in', filePath);
    console.warn(output.trim().slice(0, 2000));
  }
}

process.exit(0);
