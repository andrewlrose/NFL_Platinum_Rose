#!/usr/bin/env node
/**
 * NFL Dashboard — Session End Hook
 * Stamps .nfl/memory.json; prints end checklist.
 *
 * Trigger: Stop
 */
'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '..', '..');
const MEMORY = path.join(ROOT, '.nfl', 'memory.json');

function atomicWrite(filePath, data) {{
    const tmp = filePath + '.tmp.' + Date.now();
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, filePath);
}}

function main() {{
    const today = new Date().toISOString().split('T')[0];
    let mem = {{}};
    if (fs.existsSync(MEMORY)) {{
        try {{ mem = JSON.parse(fs.readFileSync(MEMORY, 'utf8')); }} catch (e) {{}}
    }}
    mem.last_session_date = today;
    mem.total_sessions    = (mem.total_sessions || 0) + 1;

    try {{
        atomicWrite(MEMORY, mem);
        console.log('[session-end] .nfl/memory.json updated — session ' + mem.total_sessions);
    }} catch (e) {{
        console.error('[session-end] Failed to update memory.json: ' + e.message);
    }}

    console.log('\n══ NFL Session End Checklist ═════════════');
    console.log('  [ ] git status — uncommitted work?');
    console.log('  [ ] HANDOFF_PROMPT.md regenerated?');
    console.log('  [ ] Open threads updated in .nfl/memory.json?');
    console.log('  [ ] New lessons for .claude/rules/lessons-learned.md?');
    console.log('  [ ] AGENT_LOCK.json released?');
    console.log('  [ ] npm run build — passes?');
    console.log('══════════════════════════════════════════\n');
}}

main();
