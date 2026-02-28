-- ═══════════════════════════════════════════════════════════════════════════════
-- NFL Platinum Rose — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── odds_snapshots ──────────────────────────────────────────────────────────
-- One row per OddsIngestAgent poll.
-- React app reads the most recent row to populate LiveOddsDashboard.

create table if not exists public.odds_snapshots (
  id          uuid        primary key default gen_random_uuid(),
  fetched_at  timestamptz not null default now(),
  game_count  int,
  games       jsonb       not null  -- array of ProcessedGame objects
);

create index if not exists odds_snapshots_fetched_at_idx
  on public.odds_snapshots (fetched_at desc);

-- RLS: anyone can read (anon key), service_role bypasses for writes
alter table public.odds_snapshots enable row level security;

create policy "public_read_odds_snapshots"
  on public.odds_snapshots for select
  using (true);


-- ─── line_movements ──────────────────────────────────────────────────────────
-- One row per detected line change between consecutive agent polls.
-- Read by SteamMoveTracker and LineMovementTracker.

create table if not exists public.line_movements (
  id           uuid        primary key default gen_random_uuid(),
  detected_at  timestamptz not null default now(),
  game_key     text        not null,  -- e.g. "Buffalo Bills_Kansas City Chiefs"
  home_team    text,
  away_team    text,
  book         text,                  -- e.g. "draftkings"
  type         text,                  -- 'spread' | 'total' | 'moneyline'
  from_line    numeric,
  to_line      numeric,
  movement     numeric                -- to_line - from_line
);

create index if not exists line_movements_detected_at_idx
  on public.line_movements (detected_at desc);

create index if not exists line_movements_game_key_idx
  on public.line_movements (game_key);

-- RLS: anyone can read
alter table public.line_movements enable row level security;

create policy "public_read_line_movements"
  on public.line_movements for select
  using (true);


-- ─── game_results ─────────────────────────────────────────────────────────────
-- Written by NFLAutoGradeAgent (future). Used to auto-grade pending picks.

create table if not exists public.game_results (
  id           uuid        primary key default gen_random_uuid(),
  espn_id      text        unique,
  season       int,
  week         int,
  home_team    text        not null,
  away_team    text        not null,
  home_score   int,
  away_score   int,
  status       text,       -- 'final' | 'in_progress' | 'scheduled'
  game_date    date,
  fetched_at   timestamptz not null default now()
);

create index if not exists game_results_week_season_idx
  on public.game_results (season, week);

alter table public.game_results enable row level security;

create policy "public_read_game_results"
  on public.game_results for select
  using (true);
