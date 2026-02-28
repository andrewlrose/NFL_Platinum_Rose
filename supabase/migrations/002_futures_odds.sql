-- ═══════════════════════════════════════════════════════════════════════════════
-- NFL Platinum Rose — Futures Odds Snapshots
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── futures_odds_snapshots ──────────────────────────────────────────────────
-- One row per team per market per agent poll.
-- Read by FuturesOddsMonitor to track line movements over time.

create table if not exists public.futures_odds_snapshots (
  id              bigserial   primary key,
  snapshot_time   timestamptz not null default now(),
  market_type     text        not null,   -- 'superbowl' | 'conference_afc' | 'conference_nfc' | 'division_*' | 'wins' | 'playoffs'
  team            text        not null,
  book            text        not null,   -- 'draftkings' | 'fanduel' | etc.
  odds            int         not null,   -- American odds
  implied_prob    numeric(7,4)            -- 0.0–1.0
);

create index if not exists futures_snapshots_time_idx
  on public.futures_odds_snapshots (snapshot_time desc);

create index if not exists futures_snapshots_team_market_idx
  on public.futures_odds_snapshots (team, market_type);

-- RLS: anyone can read, service_role writes
alter table public.futures_odds_snapshots enable row level security;

create policy "public_read_futures_snapshots"
  on public.futures_odds_snapshots for select
  using (true);
