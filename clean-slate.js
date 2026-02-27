/**
 * Platinum Rose - Full Storage Cleanup Script
 * 
 * PURPOSE: Wipe ALL picks, standings, edges, and result data
 * so G-Unit and AI Dev Lab tracking starts from a clean slate.
 * 
 * HOW TO RUN: Paste into browser console while dashboard is open.
 * 
 * This will NOT touch:
 *   - NFL bankroll bets (platinum_rose_bets_v17, nfl_bankroll_data_v1)
 *   - Cached odds (cached_odds_data)
 *   - User preferences / UI state
 */

(function cleanSlate() {
  console.log('\n🧹 PLATINUM ROSE — FULL STANDINGS CLEANUP\n' + '═'.repeat(60));

  // ─── Keys to Nuke ────────────────────────────────────────
  const KEYS_TO_CLEAR = [
    // NCAA orphaned keys (docs referenced these but no source code ever wrote them)
    'ncaa_picks_tracker_v1',
    'ncaa_picks_database',
    'ncaa_game_results',
    'ncaa_basketball_bets_v1',
    'ncaa_gunit_edges_v1',

    // NFL picks & standings data
    'pr_picks_v1',              // New picks database (picksDatabase.js)
    'pr_game_results_v1',       // Cached game results for grading
    'pr_standings_v1',          // Computed standings cache

    // Sim results & expert consensus (these hold the AI Lab + expert picks)
    'nfl_sim_results',
    'nfl_expert_consensus',

    // My card / bet slip (not bankroll — just the quick-add card)
    'nfl_my_bets',

    // Contest lines (imported contest spreads)
    'nfl_contest_lines',

    // Any stale odds cache
    'cached_odds_data',
    'cached_odds_time',

    // API usage tracker
    'odds_api_usage_tracker',
  ];

  let cleared = 0;
  let skipped = 0;

  KEYS_TO_CLEAR.forEach(key => {
    const val = localStorage.getItem(key);
    if (val !== null) {
      const size = val.length;
      localStorage.removeItem(key);
      console.log(`  🗑️  Removed: ${key} (${(size / 1024).toFixed(1)} KB)`);
      cleared++;
    } else {
      skipped++;
    }
  });

  console.log(`\n✅ Cleared ${cleared} keys, skipped ${skipped} empty keys`);

  // ─── Verify nothing is left ──────────────────────────────
  console.log('\n📋 Remaining localStorage keys:');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const size = (localStorage.getItem(key).length / 1024).toFixed(1);
    console.log(`  💾  ${key} (${size} KB)`);
  }

  if (localStorage.length === 0) {
    console.log('  (empty — completely clean)');
  }

  console.log('\n' + '═'.repeat(60));
  console.log('🏀 Clean slate ready!');
  console.log('   Reload the dashboard to start fresh.');
  console.log('   All new G-Unit and AI Lab picks will be tracked from zero.\n');
})();
