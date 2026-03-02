-- ═══════════════════════════════════════════════════════════════════════════════
-- NFL Platinum Rose — Pick Extraction Promotion Tracking (Migration 005)
-- Run in: Supabase Dashboard → SQL Editor → New query
--
-- Adds picks_promoted_at to podcast_transcripts so the PickExtractionAgent
-- can track which transcripts have already been promoted to user_picks.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── podcast_transcripts: promotion tracking ─────────────────────────────────

alter table public.podcast_transcripts
  add column if not exists picks_promoted_at timestamptz default null;

-- Index for efficient "find unpromoted transcripts" queries
create index if not exists podcast_transcripts_unpromoted_idx
  on public.podcast_transcripts (picks_promoted_at)
  where picks_promoted_at is null;

comment on column public.podcast_transcripts.picks_promoted_at is
  'Set by PickExtractionAgent when picks have been promoted to user_picks. NULL = not yet promoted.';


-- ─── user_picks: extended fields for podcast-sourced picks ───────────────────
-- These columns are populated by PickExtractionAgent and read back by the app.

alter table public.user_picks
  add column if not exists rationale  text        default null,
  add column if not exists expert     text        default null,
  add column if not exists units      numeric     default 1;

comment on column public.user_picks.rationale is
  'Pick rationale / summary. Populated from GPT summary for podcast picks; from user input for manual picks.';
comment on column public.user_picks.expert is
  'Expert or podcast show name for EXPERT source picks (e.g. "Warren Sharp", "Action Network").';
comment on column public.user_picks.units is
  'Bet size in units (1-5). Extracted from podcast transcript where available; defaults to 1.';
