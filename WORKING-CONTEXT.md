# WORKING-CONTEXT.md — NFL Platinum Rose
> **Live operational state. Update this file at every session close.**
> **Read this at session start before touching any file.**
> Last updated: 2026-04-02 | Branch: `main` | HEAD: 90bb3ea

---

## Current Mode

```
MODE: Feature Development
Active: April 2, 2026
Context: Governance migration complete. All 6 phases done. Ready for feature work.
Reference: docs/ROADMAP.md for next features
```

---

## Active Sprint

| ID | Task | Status | Notes |
|----|------|--------|-------|
| **Phase 1** | Governance Foundation | ✅ Done | SOUL.md, RULES.md, WORKING-CONTEXT.md, TASK_BOARD.md, AGENTS.md |
| **Phase 2** | Contexts + Hooks + Rules | ✅ Done | contexts/ (5), hooks/hooks.json, rules/ (4) |
| **Phase 3** | Dev Agent Architecture | ✅ Done | agents/dev/ — 15 adapted YAML-frontmatter agent prompts |
| **Phase 4** | Product Agent Layer | ✅ Done | BETTING.md, INTEL.md (tier1), betting.manifest.json |
| **Phase 5** | CLAUDE.md Consolidation | ✅ Done | Orchestration Directives, Session Protocols, Custom Commands, Prompting Discipline |
| **Phase 6** | NFL-Specific Additions | ✅ Done | ANTI_PATTERNS.md, HANDOFF_PROMPT.md, AGENT_LOCK.json, GOTCHAS.md, gen_resume.js |

---

## Data Source Health

| Source | Status | Last Refreshed | Notes |
|--------|--------|---------------|-------|
| TheOddsAPI | ⏸️ Offseason | — | 500 req/month free plan; manual fetch only |
| ESPN Scoreboard | ✅ Available | — | NFL offseason — no active games |
| Supabase | ✅ Connected | — | odds_snapshots, line_movements, game_results, futures, podcasts |
| Schedule.json | ✅ Local | — | `public/schedule.json` |
| Weekly Stats | ✅ Local | — | `public/weekly_stats.json` |
| Podcast Pipeline | ✅ Built | — | Groq → AssemblyAI → OpenAI Whisper fallback chain |

---

## Blockers

None currently. Phase 2 can begin in next session.

---

## Head Commit

```
Branch: main
Commit: 90bb3ea — Phase 6: NFL-Specific Additions (governance migration complete)
```

---

## Next Session Priority

**Governance migration complete.** All 6 phases of `NFL_EVOLUTION_PLAN.md` are done.
1. Push all local commits to origin
2. Consult `docs/ROADMAP.md` for next feature priorities
3. Run `npm run resume` to generate canonical resume command
