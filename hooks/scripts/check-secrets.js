#!/usr/bin/env node
/**
 * check-secrets.js — NFL Dashboard
 * Stop hook — scans git-modified files for hardcoded API keys and secrets.
 * BLOCKS (exit 2) on high-confidence matches.
 *
 * Exit codes:
 *   0 — clean (or warnings only)
 *   2 — secret detected (blocking)
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

if (process.env.NFL_SKIP_HOOKS === 'true') {
  process.exit(0);
}

const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();

/** @type {{ name: string; pattern: RegExp; severity: 'BLOCK' | 'WARN' }[]} */
const SECRET_PATTERNS = [
  { name: 'OpenAI API key', pattern: /sk-[a-zA-Z0-9]{20,}/, severity: 'BLOCK' },
  { name: 'Supabase JWT key', pattern: /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/, severity: 'BLOCK' },
  { name: 'Hard-coded SUPABASE_URL', pattern: /SUPABASE_URL\s*=\s*['"]https:\/\/[^'"]+\.supabase\.co/, severity: 'BLOCK' },
  { name: 'Hard-coded API key assignment', pattern: /(?:API_KEY|OPENAI_API_KEY|GROQ_API_KEY|ASSEMBLYAI_API_KEY)\s*=\s*['"][^'"]{10,}/, severity: 'BLOCK' },
  { name: 'Hard-coded service role key', pattern: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"][^'"]{10,}/, severity: 'BLOCK' },
  { name: 'Possible password literal', pattern: /password\s*[:=]\s*['"][^'"]{8,}['"]/i, severity: 'WARN' },
];

function getModifiedFiles() {
  try {
    const output = execSync('git diff --name-only HEAD', {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    });
    return output
      .split('\n')
      .map(f => f.trim())
      .filter(f => f && !f.includes('.env') && !f.includes('node_modules'));
  } catch {
    return [];
  }
}

const files = getModifiedFiles();
if (files.length === 0) process.exit(0);

const hits = [];

for (const relPath of files) {
  if (/\.(png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|pdf|zip|lock)$/.test(relPath)) continue;
  if (relPath.startsWith('hooks/scripts/')) continue;

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
    if (line.trimStart().startsWith('//') || line.trimStart().startsWith('#')) continue;
    for (const { name, pattern, severity } of SECRET_PATTERNS) {
      if (pattern.test(line)) {
        hits.push({ file: relPath, line: i + 1, text: line.trim().slice(0, 100), name, severity });
      }
    }
  }
}

if (hits.length === 0) process.exit(0);

const blocking = hits.filter(h => h.severity === 'BLOCK');
const warnings = hits.filter(h => h.severity === 'WARN');

if (warnings.length > 0) {
  console.warn('\n⚠️  NFL HOOK — Possible secret literals (review):');
  for (const { file, line, text, name } of warnings) {
    console.warn(`  [WARN] ${name} — ${file}:${line}  →  ${text}`);
  }
}

if (blocking.length > 0) {
  console.error('\n🔴 NFL HOOK — SECRET DETECTED — BLOCKING:');
  for (const { file, line, text, name } of blocking) {
    console.error(`  [BLOCK] ${name} — ${file}:${line}  →  ${text}`);
  }
  console.error('\nRemove hardcoded secrets. Use .env variables and import.meta.env.VITE_*');
  process.exit(2);
}

process.exit(0);
