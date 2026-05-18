#!/usr/bin/env node
/**
 * props-auto-grade.js — NFL Dashboard Props Auto-Grade Agent
 *
 * Grades player prop bets after game results are final.
 * Parallel to nfl-auto-grade.js but for props (not game outcomes).
 *
 * Logic:
 *   1. Fetch ungraded prop bets from user_bankroll_bets WHERE graded=false AND type='prop'
 *   2. Fetch official player stats for the relevant week/player from Supabase
 *   3. Compare prop line against actual stat
 *   4. Update user_bankroll_bets SET graded=true, result='win'|'loss'|'push'
 *
 * Usage:
 *   node agents/props-auto-grade.js [--week <1-18>] [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[props-auto-grade] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const weekIdx = args.indexOf('--week');
const weekFilter = weekIdx >= 0 ? parseInt(args[weekIdx + 1], 10) : null;

/**
 * Grade a single prop bet.
 * @param {{ player: string, stat: string, line: number, direction: 'over'|'under' }} bet
 * @param {number} actual - actual stat value
 * @returns {'win'|'loss'|'push'}
 */
function gradeProp(bet, actual) {
  if (actual === bet.line) return 'push';
  const over = actual > bet.line;
  return (over && bet.direction === 'over') || (!over && bet.direction === 'under')
    ? 'win'
    : 'loss';
}

async function main() {
  console.log('[props-auto-grade] Starting...');
  if (dryRun) console.log('[props-auto-grade] DRY RUN mode');

  // Fetch ungraded prop bets
  let query = sb
    .from('user_bankroll_bets')
    .select('*')
    .eq('graded', false)
    .eq('bet_type', 'prop');
  if (weekFilter) query = query.eq('week', weekFilter);

  const { data: bets, error } = await query;
  if (error) { console.error('[props-auto-grade] Fetch error:', error.message); process.exit(1); }
  console.log(`[props-auto-grade] Found ${bets?.length ?? 0} ungraded props`);

  let graded = 0;
  let skipped = 0;

  for (const bet of bets ?? []) {
    // Resolve the Supabase column name from the bet's stat field.
    // Bets are expected to carry: stat_column (e.g. 'player_rush_yds'), player_id, week.
    const statCol  = bet.stat_column;
    const playerId = bet.player_id;
    const betWeek  = bet.week;

    if (!statCol || !playerId) {
      console.warn(`  [skip] Bet #${bet.id} missing stat_column or player_id`);
      skipped++;
      continue;
    }

    // Attempt to fetch from player_stats table.
    // If the table does not exist or the player has no row, degrade gracefully.
    let actual = null;
    try {
      const { data: stats, error: statsErr } = await sb
        .from('player_stats')
        .select(statCol)
        .eq('player_id', playerId)
        .eq('week', betWeek ?? bet.week)
        .eq('season', bet.season ?? new Date().getFullYear())
        .maybeSingle();

      if (statsErr) {
        // Table likely doesn't exist yet — warn and skip, don't crash.
        if (statsErr.code === '42P01' || statsErr.message?.includes('does not exist')) {
          if (graded === 0 && skipped === 0) {
            console.warn('[props-auto-grade] player_stats table not found — skipping all prop grading until table is created');
          }
          skipped++;
          continue;
        }
        console.warn(`  [warn] Bet #${bet.id} stats fetch error: ${statsErr.message}`);
        skipped++;
        continue;
      }

      actual = stats?.[statCol] ?? null;
    } catch (fetchErr) {
      console.warn(`  [warn] Bet #${bet.id} unexpected fetch error: ${fetchErr.message}`);
      skipped++;
      continue;
    }

    if (actual === null || actual === undefined) {
      console.log(`  [skip] Bet #${bet.id} — no ${statCol} data for player ${playerId} week ${betWeek}`);
      skipped++;
      continue;
    }

    const result = gradeProp(bet, actual);
    console.log(`  Bet #${bet.id}: ${bet.player ?? playerId} ${statCol} ${bet.direction} ${bet.line} — actual ${actual} → ${result}`);

    if (!dryRun) {
      const { error: updateErr } = await sb
        .from('user_bankroll_bets')
        .update({ graded: true, result, graded_at: new Date().toISOString() })
        .eq('id', bet.id);

      if (updateErr) {
        console.error(`  [error] Failed to update bet #${bet.id}: ${updateErr.message}`);
      } else {
        graded++;
      }
    } else {
      console.log(`    [dry-run] Would set graded=true result='${result}'`);
      graded++;
    }
  }

  console.log(`[props-auto-grade] Done. ${graded} bets graded, ${skipped} skipped.`);
}

main().catch(err => { console.error(err); process.exit(1); });
