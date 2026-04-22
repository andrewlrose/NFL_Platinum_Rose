#!/usr/bin/env node
/**
 * commit-quality.js — NFL Dashboard
 * PreToolUse:Bash hook — intercepts git commit commands.
 * Blocks --no-verify, validates conventional commit format.
 *
 * Exit codes:
 *   0 — clean
 *   2 — blocking (bad commit format or --no-verify)
 */

import { readFileSync } from 'node:fs';

if (process.env.NFL_SKIP_HOOKS === 'true') {
  process.exit(0);
}

let input;
try {
  const raw = readFileSync('/dev/stdin', 'utf8').trim();
  input = raw ? JSON.parse(raw) : {};
} catch {
  process.exit(0);
}

const command = input?.tool_input?.command ?? '';

if (!command.includes('git commit')) {
  process.exit(0);
}

// Block --no-verify
if (/--no-verify/.test(command)) {
  console.error('\n🔴 NFL HOOK — --no-verify is blocked.');
  console.error('Quality gates must not be bypassed.');
  process.exit(2);
}

// Validate conventional commit format
const msgMatch = command.match(/-m\s+['"]([^'"]+)['"]/);
if (msgMatch) {
  const msg = msgMatch[1];
  const conventional = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?!?:\s.{3,}/;
  if (!conventional.test(msg)) {
    console.error('\n🔴 NFL HOOK — Commit message does not follow conventional format.');
    console.error('Expected: type(scope): description');
    console.error('Types: feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert');
    console.error(`Got: "${msg}"`);
    process.exit(2);
  }
}

process.exit(0);
