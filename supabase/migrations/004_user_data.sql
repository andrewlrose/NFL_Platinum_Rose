-- ═══════════════════════════════════════════════════════════════════════════════
-- NFL Platinum Rose — User Data Sync Tables (Migration 004)
-- Run in: Supabase Dashboard → SQL Editor → New query
--
-- Creates user_picks and user_bankroll_bets tables for cloud sync.
-- localStorage remains the primary store; Supabase is the sync/backup layer.
-- RLS is permissive (anon can read + write) — this is a single-user personal app.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── user_picks ───────────────────────────────────────────────────────────────
-- Mirrors the pick schema from src/lib/picksDatabase.js.
-- One row per pick; id is the client-generated string ID.

create table if not exists public.user_picks (
  id              text        primary key,   -- client-generated: "{source}-{gameId}-{type}-{ts}"
  game_id         text        not null,
  source          text        not null,      -- 'AI_LAB' | 'EXPERT'
  pick_type       text        not null,      -- 'spread' | 'total' | 'moneyline'
  selection       text        not null,
  line            numeric,
  edge            numeric     default 0,
  confidence      int,
  home            text,
  visitor         text,
  game_date       text,                      -- "YYYY-MM-DD"
  game_time       text,
  commence_time   text,
  is_home_team    boolean     default false,
  result          text        default 'PENDING',  -- 'PENDING' | 'WIN' | 'LOSS' | 'PUSH'
  home_score      int,
  visitor_score   int,
  graded_at       timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists user_picks_game_id_idx   on public.user_picks (game_id);
create index if not exists user_picks_source_idx    on public.user_picks (source);
create index if not exists user_picks_result_idx    on public.user_picks (result);
create index if not exists user_picks_created_at_idx on public.user_picks (created_at desc);

-- RLS: permissive — anon key can read + write (single-user personal app)
alter table public.user_picks enable row level security;

create policy "anon_all_user_picks"
  on public.user_picks for all
  using (true)
  with check (true);


-- ─── user_bankroll_bets ───────────────────────────────────────────────────────
-- Mirrors the bet schema from src/lib/bankroll.js.
-- One row per bet; stats/settings remain localStorage-only (rarely updated).

create table if not exists public.user_bankroll_bets (
  id              text        primary key,   -- client-generated: "bet_{ts}_{random}"
  timestamp       timestamptz,
  week            int,
  status          text        default 'pending', -- 'pending' | 'won' | 'lost' | 'pushed' | 'void'
  is_parlay       boolean     default false,
  is_hedging_bet  boolean     default false,
  open_slots      int         default 0,
  legs            jsonb       default '[]',
  source          text        default 'Manual',
  ticket_number   text,
  imported        boolean     default false,
  imported_at     timestamptz,
  description     text,
  amount          numeric,
  odds            numeric,
  type            text,
  potential_win   numeric     default 0,
  profit          numeric,
  settled_at      timestamptz,
  updated_at      timestamptz default now()
);

create index if not exists user_bankroll_bets_status_idx  on public.user_bankroll_bets (status);
create index if not exists user_bankroll_bets_ts_idx      on public.user_bankroll_bets (timestamp desc);

-- RLS: permissive — anon key can read + write
alter table public.user_bankroll_bets enable row level security;

create policy "anon_all_user_bankroll_bets"
  on public.user_bankroll_bets for all
  using (true)
  with check (true);
