# WORKING-CONTEXT.md — NFL Platinum Rose
> **Live operational state. Update this file at every session close.**
> **Read this at session start before touching any file.**
> Last updated: 2026-04-17 | Branch: `main` | HEAD: _(run `git log -1 --oneline`)_

---

## Current Mode

```
MODE: Feature Development (offseason)
Active: April 17, 2026
Context: Governance migration done. F-6 BETTING, F-7 DFS, F-8 PROPS agents all live.
         Season bumped 2025 → 2026 across React app + nfl-auto-grade.js.
         Python scripts (scripts/*.py) intentionally still SEASON = 2025 — deferred to Aug 2026.
Reference: TASK_BOARD.md (F-9 Weekly Betting Analyst is next backlog), docs/ROADMAP.md (P1/P2/P3 core features complete)
```

---

## Active Sprint

| ID | Task | Status | Notes |
|----|------|--------|-------|
| **Phase 1** | Governance Foundation | ✅ Done | SOUL.md, RULES.md, WORKING-CONTEXT.md, TASK_BOARD.md, AGENTS.md |
| **Phase 2** | Contexts + Hooks + Rules | ✅ Done | contexts/ (5), hooks/hooks.json, rules/ (4) |
| **Phase 3** | Dev Agent Architecture | ✅ Done | agents/dev/ — 15 adapted YAML-frontmatter agent prompts |
| **Phase 4** | Product Agent Layer | ✅ Done | BETTING.md, INTEL.md, PROPS.md (tier1), betting/props manifests |
| **Phase 5** | CLAUDE.md Consolidation | ✅ Done | Orchestration Directives, Session Protocols, Custom Commands, Prompting Discipline |
| **Phase 6** | NFL-Specific Additions | ✅ Done | ANTI_PATTERNS.md, HANDOFF_PROMPT.md, AGENT_LOCK.json, GOTCHAS.md, gen_resume.js |
| **F-6** | BETTING Agent Chat | ✅ Done | Agent tab live (7 tools) |
| **F-7** | DFS Lineup Optimizer | ✅ Done | DFS tab live (DK/FD, greedy optimizer) |
| **F-8** | PROPS Agent Chat | ✅ Done | Props tab live (7 tools; prop lines stubbed) |

---

## Data Source Health

| Source | Status | Last Refreshed | Notes |
|--------|--------|---------------|-------|
| TheOddsAPI | ⏸️ Offseason | — | 500 req/month free plan; manual fetch only; props NOT available on free tier |
| ESPN Scoreboard | ✅ Available | — | NFL offseason — no active games |
| ESPN Injuries | ✅ Available | — | Endpoints now `seasons/2026` primary, `seasons/2025` fallback |
| Supabase | ✅ Connected | — | odds_snapshots, line_movements, game_results, futures, podcasts, user_picks |
| Schedule.json | ✅ Local | — | `public/schedule.json` |
| Weekly Stats | ✅ Local | — | `public/weekly_stats.json` — still 2025 data until Python scripts re-bumped (late Aug 2026) |
| Podcast Pipeline | ✅ Built | — | Groq → AssemblyAI → OpenAI Whisper fallback chain |

---

## Blockers

None.

## Deferred (known, non-blocking)

- **Python scripts season bump** (`scripts/*.py`): intentionally still `SEASON = 2025`. 2026 regular-season stats data doesn't exist until Sep 2026; premature bump would wipe `weekly_stats.json`. Revisit late-August 2026.
- **Props auto-grade pipeline agent**: no GHA agent yet grades `nfl_props_picks_v1`. Candidate future feature (parallel to `agents/nfl-auto-grade.js`).

---

## Head Commit

```
Branch: main
Commit: (run `git log -1 --oneline` — latest is the F-8 PROPS agent + season bump)
Remote: origin/main synced
```

---

## Next Session Priority

**F-6, F-7, F-8 all shipped. Governance layer + three Tier-1 product agents live.**
1. **F-9 Weekly Betting Analyst Tier-1 agent** (P2) — Sunday slate analysis: best bets, teasers, round robins, correlated parlays. Dev-agent prompt `agents/dev/WEEKLY_BETTING_ANALYST_PROMPT.md` already exists; build the chat-facing Tier-1 version
2. Consider scoping a Props auto-grade GHA agent (future F-10)
3. Run `npm run resume` to generate canonical resume command
