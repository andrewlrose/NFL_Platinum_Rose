-- DS-5: game-level odds snapshots (spread / moneyline / total by book)
--
-- Captures point-in-time odds for regular season games.
-- One row per (game_id, book, market, captured_at) — append-only time series.
-- game_id is the deterministic key from the `games` table (week_home_away).

create table if not exists public.game_odds_snapshots (
  id bigserial primary key,

  -- Game identity
  game_id    text not null,   -- matches games.game_id  e.g. "2026_01_KC_BAL"
  season     int  not null,
  week       int  not null,
  home_team  text not null,
  away_team  text not null,
  commence_time timestamptz,

  -- Odds market
  book       text not null,   -- bookmaker key, e.g. "draftkings"
  market     text not null,   -- "spread" | "moneyline" | "total"

  -- Market values (null when not applicable for market type)
  home_price  int,            -- american odds for home / over
  away_price  int,            -- american odds for away / under
  spread      numeric(5,1),   -- positive = home favored (e.g. -3.5)
  total       numeric(5,1),   -- over/under line

  -- Metadata
  captured_at timestamptz not null default now()
);

-- Index for the BETTING agent tool: latest odds for a specific game
create index if not exists game_odds_snapshots_game_market_idx
  on public.game_odds_snapshots (game_id, market, captured_at desc);

-- Index for line movement queries: all snapshots for a game over time
create index if not exists game_odds_snapshots_game_captured_idx
  on public.game_odds_snapshots (game_id, captured_at desc);

-- Index for week-level queries (show all lines for a given week)
create index if not exists game_odds_snapshots_week_idx
  on public.game_odds_snapshots (season, week, captured_at desc);

alter table public.game_odds_snapshots enable row level security;

create policy "public_read_game_odds_snapshots"
  on public.game_odds_snapshots for select
  using (true);
