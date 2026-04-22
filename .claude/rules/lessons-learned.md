---
inclusion: always
description: NFL Dashboard — project patterns and lessons learned
---

# Lessons Learned — NFL Dashboard

Accumulated patterns from development sessions.
Review before starting any session. Add discoveries after each session.

---

## localStorage Patterns

### Canonical Key Registry
All localStorage keys MUST be registered in `hooks/scripts/localstorage-guard.js`.
Removing or renaming a key without a migration causes silent data loss for users
with existing data. Always add migration code alongside any key change.

### Key Naming Convention
`nfl_<domain>_<entity>` — e.g., `nfl_picks_current`, `nfl_bankroll_state`.
Never use generic keys that could collide with other apps.

---

## Agent Architecture

### Betting Agent Tool Schema
All betting agents use `betting.manifest.json` for tool schemas.
Model routing: Sonnet for analysis, Opus for strategy/planning.
Never import agent tools outside the manifest — runtime loads from manifest only.

### Context Behavioral Modes
Active context modes: `offseason`, `season-active`, `dev`, `research`, `review`.
Load the correct mode file from `contexts/` at session start.
`offseason` mode disables live odds refresh and API agents.

---

## API / Data Patterns

### Supabase Table Ownership
Tables: `odds_snapshots`, `line_movements`, `game_results`, `user_picks`,
`futures_odds`, `podcast_transcripts`, `user_bankroll_bets`.
Never query without `.select()` column projection — avoids over-fetching.

### Team Normalization
All team names must go through the team normalizer agent before storage.
Raw team names from different sources use different formats (e.g., "KC" vs
"Kansas City" vs "Chiefs"). The normalizer resolves to canonical form.

---

## Hot Files (Require PM Lock)

Files that must not be edited without explicit PM approval:
- `src/App.jsx` — root routing; any change breaks navigation
- `src/utils/storage.js` — localStorage key definitions; breaking changes
  silently corrupt user data
- `src/utils/picksDatabase.js` — picks schema; column changes require migration

---

## Testing

### Playwright Smoke Tests
12 tab smoke tests exist. Run before any PR merge.
Full suite takes ~3 minutes on local machine.
Flaky tests: none currently known — if a test flakes twice, investigate immediately.

---

*Add new patterns here after each session.*
