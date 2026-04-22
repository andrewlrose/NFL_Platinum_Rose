#!/usr/bin/env node
/**
 * check-console-log.js — NFL Dashboard
 * Stop hook — scans git-modified JS/JSX files for console.log statements.
 * Non-blocking (exit 0) — prints warnings only.
 *
 * Exit codes:
 *   0 — always (advisory)
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

if (process.env.NFL_SKIP_HOOKS === 'true') {
  process.exit(0);
}

const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();

function getModifiedFiles() {
  try {
    const output = execSync('git diff --name-only HEAD', {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    });
    return output
      .split('\n')
      .map(f => f.trim())
      .filter(f => f && /\.(js|jsx)$/.test(f));
  } catch {
    return [];
  }
}

const files = getModifiedFiles();
if (files.length === 0) process.exit(0);

const hits = [];

for (const relPath of files) {
  const absPath = path.join(PROJECT_ROOT, relPath);
  let content;
  try {
    content = readFileSync(absPath, 'utf8');
  } catch {
    continue;
  }
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimStart().startsWith('//')) continue;
    if (/console\.log\(/.test(line)) {
      hits.push({ file: relPath, line: i + 1, text: line.trim().slice(0, 100) });
    }
  }
}

if (hits.length > 0) {
  console.warn('\n⚠️  NFL HOOK — console.log detected in modified files:');
  for (const { file, line, text } of hits) {
    console.warn(`  ${file}:${line}  →  ${text}`);
  }
  console.warn('\nRemove console.log before committing.');
}

process.exit(0);
