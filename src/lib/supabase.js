// src/lib/supabase.js
// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE CLIENT — browser-side, uses anon key (read-only public data)
// Agents use service_role key via process.env, not this file.
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const isAvailable = () => !!supabase;

// ─── Odds ────────────────────────────────────────────────────────────────────

/**
 * Get the most recent odds snapshot written by OddsIngestAgent.
 * Returns { games: ProcessedGame[], fetchedAt: string } or null.
 */
export async function getLatestOddsSnapshot() {
  if (!isAvailable()) return null;
  try {
    const { data, error } = await supabase
      .from('odds_snapshots')
      .select('games, fetched_at')
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return { games: data.games || [], fetchedAt: data.fetched_at };
  } catch (e) {
    console.warn('[supabase] getLatestOddsSnapshot failed:', e.message);
    return null;
  }
}

// ─── Line Movements ──────────────────────────────────────────────────────────

/**
 * Get line movements from Supabase (last N hours).
 * Normalises to the format used by SteamMoveTracker / LineMovementTracker:
 * { game, type, from, to, movement, book, timestamp }
 */
export async function getLineMovementsDB(hours = 24) {
  if (!isAvailable()) return [];
  try {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('line_movements')
      .select('*')
      .gte('detected_at', cutoff)
      .order('detected_at', { ascending: false })
      .limit(200);

    if (error || !data) return [];

    // Normalise to storage format expected by getLineMovements()
    return data.map(row => ({
      id:        row.id,
      game:      row.game_key?.replace('_', ' @ ') ?? 'Unknown',
      home_team: row.home_team,
      away_team: row.away_team,
      book:      row.book,
      type:      row.type,
      from:      row.from_line,
      to:        row.to_line,
      movement:  row.movement,
      timestamp: row.detected_at,
    }));
  } catch (e) {
    console.warn('[supabase] getLineMovementsDB failed:', e.message);
    return [];
  }
}

// ─── Picks / Grading (future tables) ─────────────────────────────────────────

/**
 * Get all line movements for a specific game_key (for historical chart).
 * Unlike getLineMovementsDB this queries by game_key and uses a long window.
 * @param {string} gameKey  — e.g. "Buffalo Bills_Kansas City Chiefs"
 * @param {number} hours    — how far back to look (default 7 days)
 */
export async function getLineHistoryDB(gameKey, hours = 7 * 24) {
  if (!isAvailable() || !gameKey) return [];
  try {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('line_movements')
      .select('*')
      .eq('game_key', gameKey)
      .gte('detected_at', cutoff)
      .order('detected_at', { ascending: true });

    if (error || !data) return [];
    return data;
  } catch (e) {
    console.warn('[supabase] getLineHistoryDB failed:', e.message);
    return [];
  }
}

/**
 * Get all unique game keys from line_movements in the last N hours.
 * Used to populate the game selector in LineHistoryChart.
 */
export async function getActiveGameKeys(hours = 7 * 24) {
  if (!isAvailable()) return [];
  try {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('line_movements')
      .select('game_key, home_team, away_team')
      .gte('detected_at', cutoff);

    if (error || !data) return [];
    // Deduplicate by game_key
    const seen = new Set();
    return data.filter(r => {
      if (seen.has(r.game_key)) return false;
      seen.add(r.game_key);
      return true;
    });
  } catch (e) {
    console.warn('[supabase] getActiveGameKeys failed:', e.message);
    return [];
  }
}

// ─── Futures Odds ─────────────────────────────────────────────────────────────

/**
 * Get the most recent futures odds snapshot for each team+market+book combo.
 * Returns the latest row per (market_type, team, book) — i.e. current market odds.
 * Used by FuturesOddsMonitor to compare entry price vs current odds.
 *
 * @returns {Promise<Array>} rows: { market_type, team, book, odds, implied_prob, snapshot_time }
 */
export async function getLatestFuturesOdds() {
  if (!isAvailable()) return [];
  try {
    // Get timestamps of most recent snapshot per market_type so we can filter to it
    const { data: latest, error: latestErr } = await supabase
      .from('futures_odds_snapshots')
      .select('market_type, snapshot_time')
      .order('snapshot_time', { ascending: false })
      .limit(3); // one per market type

    if (latestErr || !latest?.length) return [];

    // Group latest snapshot_time by market_type
    const latestByMarket = new Map();
    for (const row of latest) {
      if (!latestByMarket.has(row.market_type)) {
        latestByMarket.set(row.market_type, row.snapshot_time);
      }
    }

    // Fetch all rows within 15 minutes of the latest snapshot per market
    const allRows = [];
    for (const [marketType, latestTime] of latestByMarket) {
      const windowStart = new Date(new Date(latestTime).getTime() - 15 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('futures_odds_snapshots')
        .select('market_type, team, book, odds, implied_prob, snapshot_time')
        .eq('market_type', marketType)
        .gte('snapshot_time', windowStart)
        .order('snapshot_time', { ascending: false });

      if (!error && data) allRows.push(...data);
    }

    return allRows;
  } catch (e) {
    console.warn('[supabase] getLatestFuturesOdds failed:', e.message);
    return [];
  }
}

/**
 * Get historical futures odds for a specific team+market (for trend chart).
 * @param {string} team        — exact team name as stored
 * @param {string} marketType  — 'superbowl' | 'conference' | 'division'
 * @param {number} days        — how far back (default 30 days)
 */
export async function getFuturesOddsHistory(team, marketType, days = 30) {
  if (!isAvailable() || !team || !marketType) return [];
  try {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('futures_odds_snapshots')
      .select('snapshot_time, book, odds, implied_prob')
      .eq('team', team)
      .eq('market_type', marketType)
      .gte('snapshot_time', cutoff)
      .order('snapshot_time', { ascending: true });

    if (error || !data) return [];
    return data;
  } catch (e) {
    console.warn('[supabase] getFuturesOddsHistory failed:', e.message);
    return [];
  }
}

/**
 * Get game results for auto-grading pending picks.
 * Table: game_results (written by NFLAutoGradeAgent)
 */
export async function getGameResults({ week, season } = {}) {
  if (!isAvailable()) return [];
  try {
    let query = supabase.from('game_results').select('*');
    if (week)   query = query.eq('week', week);
    if (season) query = query.eq('season', season);
    const { data, error } = await query;
    if (error || !data) return [];
    return data;
  } catch (e) {
    console.warn('[supabase] getGameResults failed:', e.message);
    return [];
  }
}

/**
 * Look up specific games by ESPN ID (for auto-grading pending picks).
 * @param {string[]} espnIds  — array of ESPN game IDs that match pick.gameId
 * @returns {Promise<Array>}
 */
export async function getGameResultsByIds(espnIds) {
  if (!isAvailable() || !espnIds?.length) return [];
  try {
    const { data, error } = await supabase
      .from('game_results')
      .select('*')
      .in('espn_id', espnIds)
      .eq('status', 'final');

    if (error || !data) return [];
    return data;
  } catch (e) {
    console.warn('[supabase] getGameResultsByIds failed:', e.message);
    return [];
  }
}
