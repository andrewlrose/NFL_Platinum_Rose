#!/usr/bin/env node
/**
 * localstorage-guard.js — NFL Dashboard
 * PostToolUse:Edit|Write hook — detects changes to canonical
 * localStorage key strings in critical storage files.
 * BLOCKS if a key name is changed without a migration helper.
 *
 * Exit codes:
 *   0 — clean
 *   2 — localStorage key name change detected (blocking)
 */

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

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

// Only guard the critical storage files
const GUARDED_FILES = [
  'src/lib/storage.js',
  'src/lib/picksDatabase.js',
  'src/lib/bankroll.js',
  'src/lib/futures.js',
];

const relPath = filePath.replace(/\\/g, '/');
const isGuarded = GUARDED_FILES.some(f => relPath.endsWith(f));
if (!isGuarded) process.exit(0);

// Check git diff for localStorage key name changes
const CANONICAL_KEYS = [
  'pr_picks_v1',
  'nfl_bankroll_data_v1',
  'nfl_futures_portfolio_v1',
  'nfl_expert_consensus',
  'nfl_splits',
  'nfl_my_bets',
  'nfl_props_picks_v1',
];

try {
  const diff = execSync(`git diff -- "${filePath}"`, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
  });

  // Look for removed lines containing canonical key names
  const removedLines = diff
    .split('\n')
    .filter(line => line.startsWith('-') && !line.startsWith('---'));

  for (const line of removedLines) {
    for (const key of CANONICAL_KEYS) {
      if (line.includes(key)) {
        // Check if the key still exists in added lines
        const addedLines = diff
          .split('\n')
          .filter(l => l.startsWith('+') && !l.startsWith('+++'));
        const stillPresent = addedLines.some(l => l.includes(key));
        if (!stillPresent) {
          console.error(`\n🔴 NFL HOOK — localStorage key "${key}" removed from ${filePath}`);
          console.error('A migration helper is REQUIRED before renaming storage keys.');
          console.error('See docs/ANTI_PATTERNS.md for the storage key migration protocol.');
          process.exit(2);
        }
      }
    }
  }
} catch {
  // Git diff failed — skip silently
}

process.exit(0);
