#!/usr/bin/env node
/**
 * Phase 7a CLI — Digest Renderer
 *
 * Usage:
 *   node scripts/render-digests.js all
 *   node scripts/render-digests.js episode --id <id>
 *   node scripts/render-digests.js week --tag <weekTag>
 *
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from /etc/nfl-podcast.env
 * (loaded automatically via dotenv). These are the service-role credentials —
 * the renderer bypasses anon RLS to read all picks.
 *
 * Exit codes: 0 = success, 1 = error.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { buildRenderer } from '../render/index.js';

// ── Parse args ────────────────────────────────────────────────────────────

const [, , command, ...flags] = process.argv;

function flag(name) {
  const idx = flags.indexOf(name);
  return idx !== -1 ? flags[idx + 1] : null;
}

if (!['all', 'episode', 'week'].includes(command)) {
  console.error(`Usage:
  node render-digests.js all
  node render-digests.js episode --id <episode-id>
  node render-digests.js week --tag <2025-W5>`);
  process.exit(1);
}

// ── Validate creds ────────────────────────────────────────────────────────

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Copy /etc/nfl-podcast.env and source it, or add to .env.',
  );
  process.exit(1);
}

// ── Run ───────────────────────────────────────────────────────────────────

const supabase = createClient(supabaseUrl, serviceRoleKey);
const renderer = buildRenderer({ supabase });

try {
  if (command === 'all') {
    const result = await renderer.renderAll();
    console.log(
      `written ${result.written} files ` +
        `(${result.episodes} episodes, ${result.experts} experts, ${result.weeks} weeks) ` +
        `in ${result.ms}ms`,
    );
  } else if (command === 'episode') {
    const id = flag('--id');
    if (!id) {
      console.error('episode command requires --id <episode-id>');
      process.exit(1);
    }
    const written = await renderer.renderForEpisode(id);
    console.log(`written ${written.written.length} files in ${written.written.join(', ') || '(none)'}`);
  } else if (command === 'week') {
    const tag = flag('--tag');
    if (!tag) {
      console.error('week command requires --tag <weekTag> e.g. 2025-W5');
      process.exit(1);
    }
    // Re-render the weekly page + all expert-week pages for this week.
    const weeklyPath = await renderer.renderWeekly(tag);
    if (!weeklyPath) {
      console.log(`No data for week ${tag}`);
    } else {
      console.log(`written ${weeklyPath}`);
    }
  }
} catch (err) {
  console.error('render-digests failed:', err?.message ?? err);
  process.exit(1);
}
