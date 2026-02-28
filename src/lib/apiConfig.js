// src/lib/apiConfig.js
// ═══════════════════════════════════════════════════════════════════════════════
// CENTRALIZED API CONFIGURATION — Single source of truth for all endpoints/keys
// ═══════════════════════════════════════════════════════════════════════════════

// --- API Keys (from .env via Vite) ---
export const ODDS_API_KEY    = import.meta.env.VITE_ODDS_API_KEY    || '';
export const OPENAI_API_KEY  = import.meta.env.VITE_OPENAI_API_KEY  || '';
export const SUPABASE_URL    = import.meta.env.VITE_SUPABASE_URL    || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// --- TheOddsAPI ---
export const ODDS_API = {
  BASE_URL: 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds',
  REGION: 'us',
  MARKETS: 'h2h,spreads,totals',
  BOOKMAKERS: 'draftkings,betonline,bookmaker,fanduel,mgm',
  CACHE_TTL_MS: 10 * 60 * 1000, // 10 minutes
};

// --- OpenAI ---
export const OPENAI_API = {
  BASE_URL: 'https://api.openai.com/v1/chat/completions',
  MODEL: 'gpt-4o',
};

// --- ESPN ---
export const ESPN_API = {
  INJURIES_URL: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams',
};

// --- GitHub Raw (splits sync) ---
export const GITHUB_RAW = {
  SPLITS_URL: 'https://raw.githubusercontent.com/andrewlrose/NFL_Platinum_Rose/main/betting_splits.json',
};

// --- Local Data (public/ files — ALWAYS use relative paths, never hardcoded /) ---
export const LOCAL_DATA = {
  SCHEDULE: './schedule.json',
  WEEKLY_STATS: './weekly_stats.json',
};
// --- Supabase ---
export const SUPABASE = {
  URL: import.meta.env.VITE_SUPABASE_URL || '',
  ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  TABLES: {
    ODDS_SNAPSHOTS: 'odds_snapshots',
    LINE_MOVEMENTS:  'line_movements',
    GAME_RESULTS:    'game_results',
  },
};