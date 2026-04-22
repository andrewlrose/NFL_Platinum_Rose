#!/usr/bin/env node
/**
 * Secret Scan Hook — fires on Stop.
 * Scans modified files for hardcoded API keys and tokens.
 *
 * Exit 0 = clean
 * Exit 1 = advisory warning (non-blocking)
 * Exit 2 = blocking secret detected
 */
'use strict';
const fs   = require('fs');
const path = require('path');
const {{ execSync }} = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');

const SECRET_PATTERNS = [
    {{ name: 'OpenAI API key',            re: /sk-[A-Za-z0-9]{{20,}}/,                                   sev: 'BLOCK' }},
    {{ name: 'Anthropic API key',         re: /sk-ant-[A-Za-z0-9_-]{{20,}}/,                             sev: 'BLOCK' }},
    {{ name: 'AWS access key',            re: /AKIA[0-9A-Z]{{16}}/,                                       sev: 'BLOCK' }},
    {{ name: 'GitHub token',              re: /gh[ps]_[A-Za-z0-9_]{{36,}}/,                              sev: 'BLOCK' }},
    {{ name: 'Supabase anon/service key', re: /eyJ[A-Za-z0-9_-]{{40,}}/,                                sev: 'BLOCK' }},
    {{ name: 'Hardcoded key assignment',  re: /(?:API_KEY|SECRET|TOKEN)\s*=\s*["'][^"']{{8,}}["']/,     sev: 'WARN'  }},
    {{ name: 'DB connection string',      re: /(?:postgres|mysql|mongodb):\/\/[^"'\s]{{10,}}/,          sev: 'WARN'  }},
];

const SKIP_EXT  = new Set(['.png','.jpg','.jpeg','.gif','.pdf','.lock','.svg','.ico','.map','.woff','.woff2']);
const SKIP_DIRS = new Set(['node_modules','.venv','dist','build','.git']);

function getModifiedFiles() {{
    try {{
        const diff   = execSync('git diff --name-only HEAD 2>/dev/null',    {{ cwd: ROOT }}).toString().trim();
        const staged = execSync('git diff --cached --name-only 2>/dev/null', {{ cwd: ROOT }}).toString().trim();
        return [...new Set([...diff.split('\n'), ...staged.split('\n')])].filter(Boolean);
    }} catch (e) {{ return []; }}
}}

function shouldSkip(f) {{
    if (SKIP_EXT.has(path.extname(f).toLowerCase())) return true;
    return f.split(/[\\/]/).some(p => SKIP_DIRS.has(p));
}}

function scanFile(filePath) {{
    let content;
    try {{ content = fs.readFileSync(filePath, 'utf8'); }} catch (e) {{ return []; }}
    return SECRET_PATTERNS
        .filter({{ re }}) => re.test(content))
        .map(({{ name, sev }}) => ({{ name, sev, filePath }}));
}}

function main() {{
    const findings = getModifiedFiles()
        .filter(f => !shouldSkip(f))
        .map(f => path.join(ROOT, f))
        .filter(f => fs.existsSync(f))
        .flatMap(f => scanFile(f));

    if (!findings.length) {{ process.exit(0); }}

    let hasBlock = false;
    for (const {{ name, sev, filePath }} of findings) {{
        const tag = sev === 'BLOCK' ? '🚨 BLOCK' : '⚠️  WARN';
        console.error('[check-secrets] ' + tag + ': ' + name + ' in ' + filePath);
        if (sev === 'BLOCK') hasBlock = true;
    }}
    process.exit(hasBlock ? 2 : 1);
}}

main();
