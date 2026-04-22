# HANDOFF_PROMPT.md — NFL Platinum Rose

> **Rolling session handoff. Overwritten at every session close via `/handoff`.**
> **Next session: read this file first, then `WORKING-CONTEXT.md`.**

---

## Last Session Summary

**Session:** F-8 — PROPS Agent Chat (Tier 1)
**Date:** 2026-04-17
**Branch:** `main`

### CRITICAL
- F-8 PROPS Agent is **DONE**. Moved to DONE on `TASK_BOARD.md`.
- New **Props** tab wired into Header nav and App.jsx (lazy-loaded, violet theme, Zap/lightning-bolt icon).
- Season rolled from 2025 → 2026 across React app + `agents/nfl-auto-grade.js`. Python scripts under `scripts/` intentionally kept at `SEASON = 2025` (2026 regular-season data won't exist until Sep 2026; bumping now would wipe `weekly_stats.json`). See **Deferred** below.

### IMPORTANT
- **Data source disclosures baked into PROPS**: TheOddsAPI free tier does not return prop markets, so `get_player_props` and `get_prop_line_shop` return stubs flagged as such. Tools read real odds snapshots first, fall back to scaled-by-PPG stubs.
- **SGP pricing is an approximation**: `build_sgp` uses a correlation-haircut model (`positive` × 0.80, `negative` × 1.05, `independent` × 0.95). Transparent to the Creator in every response.
- **Props logged separately**: writes land in `localStorage:nfl_props_picks_v1`, NOT `pr_picks_v1`. Key added to `PR_STORAGE_KEYS` catalog with `permanence: 'critical'`. No auto-grading for props yet — future GHA agent.
- **Backup-depth heuristic**: `check_backup_depth` flags starter-OUT status and heuristic volume impact per position. Does NOT know actual backup identity (no free depth-chart source).
- PROPS shares API key store with BETTING (`nfl_betting_agent_apikey_v1`) — no second setup screen.
- Model still `claude-sonnet-4-5` per manifest. If unavailable, update `MODEL_DEFAULT` in `apiConfig.js`.
- `tests/smoke.spec.js` updated — `TABS` array includes `props`.

### Blockers
None.

### Deferred (known, not blocking)
- **Python scripts season bump**: `scripts/*.py` intentionally still use `SEASON = 2025`. Revisit late-August 2026 as part of pre-season setup — after 2026 `weekly_stats` data is actually available.
- **Props auto-grade GHA agent**: no pipeline agent yet grades `nfl_props_picks_v1` entries. Candidate future feature (parallel to `nfl-auto-grade.js`).

### What Was Done
- Created `src/lib/propsTools.js` — 7 tools: `get_player_props`, `analyze_prop`, `get_prop_line_shop`, `build_sgp`, `check_backup_depth`, `get_prop_correlations`, `log_prop`
- Created `src/components/agent/PropsAgentChat.jsx` — violet-themed chat UI, Zap icon, lazy-loaded via `React.lazy()`
- Created `agents/product/tier1/PROPS.md` + `agents/manifests/props.manifest.json`
- Extended `src/lib/storage.js` with `PROPS_PICKS` key (`nfl_props_picks_v1`, `critical`)
- Added `Props` NavTab to `Header.jsx`; added `'props'` route in `App.jsx`
- Updated `tests/smoke.spec.js` TABS list
- Season 2025 → 2026 bumps in: `src/lib/constants.js`, `src/lib/bankroll.js`, `src/lib/injuries.js`, `src/lib/agentTools.js`, `src/components/dashboard/Standings.jsx`, `src/components/dashboard/ExpertLeaderboard.jsx`, `src/components/futures/PlayoffBracket.jsx`, `agents/nfl-auto-grade.js`

### Files Modified / Created This Session
- **Created:** `src/lib/propsTools.js`, `src/components/agent/PropsAgentChat.jsx`, `agents/product/tier1/PROPS.md`, `agents/manifests/props.manifest.json`
- **Modified:** `src/App.jsx`, `src/components/layout/Header.jsx`, `src/lib/storage.js`, `src/lib/constants.js`, `src/lib/bankroll.js`, `src/lib/injuries.js`, `src/lib/agentTools.js`, `src/components/dashboard/Standings.jsx`, `src/components/dashboard/ExpertLeaderboard.jsx`, `src/components/futures/PlayoffBracket.jsx`, `agents/nfl-auto-grade.js`, `tests/smoke.spec.js`, `TASK_BOARD.md`

---

## Current State

```
Branch: main
HEAD: {run `git log -1 --oneline` to confirm}
Tree: clean (after F-8 commit + season bump commit)
Tests: Playwright smoke test — TABS now includes 'props'; run before close
Remote: push latest to origin/main
```

---

## What To Do Next

1. **Run the Playwright smoke test** — confirm all 12 tabs render, including Props.
2. **Kick off F-9 Weekly Betting Analyst agent** — next BACKLOG item on TASK_BOARD.md. Sunday slate: best bets, teasers, round robins, correlated parlays. Prompt stub exists at `agents/dev/WEEKLY_BETTING_ANALYST_PROMPT.md` — build the Tier-1 product-agent version.
3. **Optional parallel:** scope a Props auto-grade pipeline agent (future F-10).
4. **Remember:** Python script season bump is deferred until late-August 2026.

---

## Resume Command

```
Resume Platinum Rose NFL. HEAD = {commit} (main). Suite: N/A. F-8 PROPS Agent complete (Props tab live, 7 tools, stubbed prop lines flagged). Season bumped to 2026 across JS/JSX; Python scripts deferred to late-August. Next: F-9 Weekly Betting Analyst Tier-1 agent. Read HANDOFF_PROMPT.md for full context before touching any file.
```

---

## ATLAS-Delegated Governance (Wave 1 — 2026-04-17)

> **Added by ATLAS PM.** These infrastructure changes were deployed by
> the parent project manager (ATLAS) as part of the Wave 1 cross-project
> governance rollout. The NFL session PM should be aware of these.

### What Changed

1. **Claude Code hooks are now ENFORCED** — 6 hook scripts in
   `hooks/scripts/` are wired via `.claude/settings.json`. Previously,
   NFL used self-enforced rules in `hooks/hooks.json`. Hooks now run
   automatically:
   - `check-secrets.js` — **BLOCKS** on hardcoded API keys (Stop)
   - `check-console-log.js` — warns on console.log in diffs (Stop)
   - `commit-quality.js` — blocks `--no-verify`, enforces `S{N}:` format (PreToolUse:Bash)
   - `protect-hot-files.js` — warns on App.jsx/storage.js/picksDatabase.js edits (PreToolUse:Write|Edit)
   - `quality-gate.js` — runs ESLint on edited files (PostToolUse:Edit|Write)
   - `localstorage-guard.js` — **BLOCKS** removal of canonical localStorage keys (PostToolUse:Edit|Write)

2. **Auto-included rules** — `.claude/rules/` now contains 4 files
   auto-loaded by Claude Code on every session:
   - `coding-conventions.md` — React/Vite/Tailwind patterns
   - `data-handling.md` — localStorage canonical keys, team normalization
   - `security-guardrails.md` — API key handling, agent coordination
   - `testing.md` — Playwright smoke test standards

3. **`.claude/settings.json` format fixed** — was using incorrect nested
   `hooks` arrays; corrected to flat Claude Code format.

### Skip Hooks

Set `NFL_SKIP_HOOKS=true` to disable all hooks for a session (e.g.,
emergency hotfix). Not recommended for normal development.

### Full Report

See `ATLAS/data/reports/2026-04-17/WAVE_1_COMPLETION_REPORT.md` for the
complete cross-project inventory.
