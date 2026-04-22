#!/usr/bin/env node
/**
 * NFL Dashboard — Session Start Hook
 * Reads HANDOFF_PROMPT.md (or HANDOFF.md) and .nfl/memory.json;
 * prints pickup context and active context mode.
 *
 * Trigger: SessionStart
 */
'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT    = path.resolve(__dirname, '..', '..');
const MEMORY  = path.join(ROOT, '.nfl', 'memory.json');
const HANDOFF = [path.join(ROOT, 'HANDOFF.md'), path.join(ROOT, 'handoffs', 'HANDOFF_PROMPT.md')]
    .find(p => fs.existsSync(p));

function main() {{
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║       NFL Dashboard — Session Start        ║');
    console.log('╚══════════════════════════════════════════╝\n');

    if (HANDOFF) {{
        const lines = fs.readFileSync(HANDOFF, 'utf8').split('\n').slice(0, 50).join('\n');
        console.log(lines);
    }} else {{
        console.log('[No HANDOFF found — cold start]\n');
    }}

    if (fs.existsSync(MEMORY)) {{
        try {{
            const mem = JSON.parse(fs.readFileSync(MEMORY, 'utf8'));
            console.log('\n--- NFL Memory Quick-Status ---');
            if (mem.last_session_date) console.log('Last session    : ' + mem.last_session_date);
            if (mem.total_sessions)    console.log('Sessions        : ' + mem.total_sessions);
            if (mem.context_mode)      console.log('Context mode    : ' + mem.context_mode);
            if (mem.active_features)   console.log('Active features : ' + JSON.stringify(mem.active_features));
            if (Array.isArray(mem.open_threads) && mem.open_threads.length) {{
                console.log('Open threads :');
                mem.open_threads.forEach(t => console.log('  • ' + t));
            }}
        }} catch (e) {{
            console.log('[memory.json parse error]');
        }}
    }}
    console.log('\n═══════════════════════════════════════════\n');
}}

main();
