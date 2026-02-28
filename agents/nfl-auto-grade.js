// agents/nfl-auto-grade.js
// ═══════════════════════════════════════════════════════════════════════════════
// NFLAutoGradeAgent — polls ESPN NFL scoreboard, writes final scores to Supabase
//
// Runtime: Node.js ESM (run via GitHub Actions or: node agents/nfl-auto-grade.js)
// Env vars required:
//   SUPABASE_URL             — https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY — service_role JWT (bypasses RLS for writes)
//
// Design principles:
//   - No external API key needed (ESPN is public)
//   - Idempotent: upsert by espn_id — safe to re-run
//   - Checks current week + prior week to catch stale-pending picks
//   - Graceful offseason handling: no games = exit cleanly
//   - maxRetries on every API call; max runtime guard
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

const MAX_RETRIES    = 3;
const MAX_RUNTIME_MS = 60_000; // bail after 60s
const RESULTS_TTL_DAYS = 90;   // keep game results for 90 days

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN      = process.env.DRY_RUN === 'true';

// ESPN publice scoreboard — no auth required
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

// ─── Supabase client ──────────────────────────────────────────────────────────

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });
}

// ─── API helpers ─────────────────────────────────────────────────────────────

async function fetchWithRetry(url, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = attempt * 2000;
      console.log(`  Retry ${attempt}/${retries} in ${delay}ms — ${err.message}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// ─── NFL season helpers ───────────────────────────────────────────────────────

/**
 * Determine current NFL week and season type from today's date.
 * Returns { season, week, seasonType, phase }
 *   seasonType: 2 = regular season, 3 = postseason
 */
function getNFLWeekInfo() {
  const SEASON_YEAR  = 2025;
  const SEASON_START = new Date('2025-09-02T00:00:00'); // Tue before Week 1 kickoff
  const now          = new Date();

  if (now < SEASON_START) {
    return { season: SEASON_YEAR, week: 0, seasonType: 2, phase: 'preseason' };
  }

  const diffDays = Math.floor((now - SEASON_START) / (1000 * 60 * 60 * 24));
  const rawWeek  = Math.floor(diffDays / 7) + 1;

  if (rawWeek <= 18) {
    return { season: SEASON_YEAR, week: rawWeek, seasonType: 2, phase: `Regular Week ${rawWeek}` };
  }

  const playoffWeek = rawWeek - 18;
  if (playoffWeek === 1) return { season: SEASON_YEAR, week: 1,  seasonType: 3, phase: 'Wild Card' };
  if (playoffWeek === 2) return { season: SEASON_YEAR, week: 2,  seasonType: 3, phase: 'Divisional' };
  if (playoffWeek === 3) return { season: SEASON_YEAR, week: 3,  seasonType: 3, phase: 'Conference' };
  if (playoffWeek === 4) return { season: SEASON_YEAR, week: 5,  seasonType: 3, phase: 'Super Bowl' };

  return { season: SEASON_YEAR, week: 0, seasonType: 0, phase: 'offseason' };
}

/**
 * Return a list of { week, seasonType } combos to query.
 * Always check current + one prior to catch recently-completed games.
 */
function getWeeksToCheck() {
  const { week, seasonType, phase } = getNFLWeekInfo();

  if (phase === 'offseason' || phase === 'preseason') {
    // Still attempt to grade any lingering ungraded playoff picks.
    // Super Bowl (week 5 of postseason): check it for ~2 weeks after game.
    return [{ week: 5, seasonType: 3 }];
  }

  const current = { week, seasonType };

  // Also include the prior week so stale-pending picks get graded
  let prior = null;
  if (seasonType === 2 && week > 1)            prior = { week: week - 1, seasonType: 2 };
  if (seasonType === 3 && week > 1)            prior = { week: week - 1, seasonType: 3 };
  if (seasonType === 3 && week === 1)          prior = { week: 18,       seasonType: 2 };

  return prior ? [current, prior] : [current];
}

// ─── ESPN scoreboard parsing ──────────────────────────────────────────────────

/**
 * Parse ESPN scoreboard response into an array of game result objects.
 * Only returns games that are final.
 */
function parseGames(data, week, seasonType) {
  const events = data?.events || [];
  const results = [];

  for (const event of events) {
    const status    = event.status?.type;
    const completed = status?.completed === true ||
                      status?.name === 'STATUS_FINAL';

    const comp = event.competitions?.[0];
    if (!comp) continue;

    const homeComp    = comp.competitors?.find(c => c.homeAway === 'home');
    const awayComp    = comp.competitors?.find(c => c.homeAway === 'away');
    if (!homeComp || !awayComp) continue;

    const homeScore   = parseInt(homeComp.score ?? '-1', 10);
    const awayScore   = parseInt(awayComp.score ?? '-1', 10);
    const hasScores   = homeScore >= 0 && awayScore >= 0;

    const gameDate    = comp.date
      ? comp.date.split('T')[0]
      : null;

    results.push({
      espn_id:    event.id,
      season:     2025,
      week,
      home_team:  homeComp.team?.displayName ?? '',
      away_team:  awayComp.team?.displayName ?? '',
      home_score: hasScores ? homeScore : null,
      away_score: hasScores ? awayScore : null,
      status:     completed && hasScores ? 'final' : (status?.name?.toLowerCase() ?? 'scheduled'),
      game_date:  gameDate,
      fetched_at: new Date().toISOString(),
    });
  }

  return results;
}

// ─── ESPN fetch wrapper ───────────────────────────────────────────────────────

async function fetchScoreboard(week, seasonType) {
  const url = `${ESPN_BASE}?seasontype=${seasonType}&week=${week}`;
  console.log(`  Fetching ESPN scoreboard: week=${week}, seasontype=${seasonType}`);
  const data = await fetchWithRetry(url);
  return parseGames(data, week, seasonType);
}

// ─── Supabase upsert ──────────────────────────────────────────────────────────

async function upsertResults(supabase, games) {
  if (games.length === 0) return 0;

  // Only upsert final games — don't overwrite a 'final' row with 'in_progress'
  const finalGames = games.filter(g => g.status === 'final');
  if (finalGames.length === 0) return 0;

  const { error } = await supabase
    .from('game_results')
    .upsert(finalGames, { onConflict: 'espn_id' });

  if (error) throw new Error(`game_results upsert failed: ${error.message}`);
  return finalGames.length;
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

async function cleanup(supabase) {
  const cutoff = new Date(Date.now() - RESULTS_TTL_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]; // YYYY-MM-DD

  const { error } = await supabase
    .from('game_results')
    .delete()
    .lt('game_date', cutoff);

  if (error) console.warn('  game_results cleanup error:', error.message);
}

// ─── Dry run mock ─────────────────────────────────────────────────────────────

function getMockGames() {
  return [
    {
      espn_id: 'DRY_RUN_MOCK_1',
      season: 2025, week: 5, home_team: 'Kansas City Chiefs', away_team: 'San Francisco 49ers',
      home_score: 24, away_score: 17, status: 'final',
      game_date: new Date().toISOString().split('T')[0],
      fetched_at: new Date().toISOString(),
    },
  ];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  const start = Date.now();
  console.log(`\n[${new Date().toISOString()}] NFLAutoGradeAgent starting`);

  // Runtime guard
  const timeout = setTimeout(() => {
    console.error('⏱ MAX_RUNTIME_MS exceeded — forcing exit');
    process.exit(2);
  }, MAX_RUNTIME_MS);

  let totalGames = 0;
  let totalUpserted = 0;

  try {
    if (DRY_RUN) {
      console.log('ℹ Dry run mode — using mock data, skipping Supabase write.');
      const mock = getMockGames();
      console.log(`  Mock games: ${mock.length} (all final)`);
      mock.forEach(g => {
        console.log(`  [DRY] ${g.away_team} @ ${g.home_team} → ${g.away_score}-${g.home_score} (${g.status})`);
      });
      clearTimeout(timeout);
      console.log('✅ NFLAutoGradeAgent dry run complete.');
      return;
    }

    const supabase = getSupabase();
    const weeks = getWeeksToCheck();
    console.log(`  Weeks to check: ${weeks.map(w => `S${w.seasonType}W${w.week}`).join(', ')}`);

    for (const { week, seasonType } of weeks) {
      const games = await fetchScoreboard(week, seasonType);
      totalGames += games.length;

      const finalCount = games.filter(g => g.status === 'final').length;
      console.log(`  S${seasonType}W${week}: ${games.length} games, ${finalCount} final`);

      games.forEach(g => {
        const score = g.status === 'final'
          ? ` → ${g.away_score}–${g.home_score}`
          : ` (${g.status})`;
        console.log(`    ${g.away_team} @ ${g.home_team}${score}`);
      });

      const upserted = await upsertResults(supabase, games);
      totalUpserted += upserted;
    }

    if (totalGames === 0) {
      console.log('ℹ No games found (offseason or bye week). Nothing to grade.');
    } else {
      console.log(`  Upserted ${totalUpserted} final game result(s).`);
    }

    // Cleanup old rows on every run
    await cleanup(supabase);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`✅ NFLAutoGradeAgent complete in ${elapsed}s — ${totalUpserted} results saved.`);

  } catch (err) {
    console.error('❌ NFLAutoGradeAgent error:', err.message);
    process.exit(1);
  } finally {
    clearTimeout(timeout);
  }
}

run();
