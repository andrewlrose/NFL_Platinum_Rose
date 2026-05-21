-- F-15 follow-up: Add formation tendency columns to nfl_team_season_stats
-- Migration: 015_pbp_tendencies.sql
--
-- Adds shotgun_rate, no_huddle_rate, pass_rate columns populated by the
-- nflverse Parquet PBP pipeline (seed-historical-stats.py --no-pbp=false).
-- All three are expressed as a fraction [0.0, 1.0].

alter table public.nfl_team_season_stats
  add column if not exists shotgun_rate   numeric(5,4),
  add column if not exists no_huddle_rate numeric(5,4),
  add column if not exists pass_rate      numeric(5,4);

comment on column public.nfl_team_season_stats.shotgun_rate is
  'Fraction of scrimmage plays run from shotgun formation (nflverse PBP).';
comment on column public.nfl_team_season_stats.no_huddle_rate is
  'Fraction of scrimmage plays run no-huddle (nflverse PBP).';
comment on column public.nfl_team_season_stats.pass_rate is
  'Fraction of scrimmage plays that are pass attempts (nflverse PBP).';
