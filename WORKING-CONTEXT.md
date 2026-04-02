# WORKING-CONTEXT.md — NFL Platinum Rose
> **Live operational state. Update this file at every session close.**
> **Read this at session start before touching any file.**
> Last updated: 2026-04-02 | Branch: `main` | HEAD: a95e624

---

## Current Mode

```
MODE: Governance Migration
Active: April 2, 2026
Context: Porting governance layer from NCAA Basketball Dashboard to NFL Dashboard
Reference: NFL_EVOLUTION_PLAN.md (6-phase migration plan)
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
| **Phase 6** | NFL-Specific Additions | 🔴 Not started | ANTI_PATTERNS.md, HANDOFF_PROMPT.md, AGENT_LOCK.json |

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
Commit: a95e624 — Phase 5: CLAUDE.md Consolidation
```

---

## Next Session Priority

**Phase 6: NFL-Specific Additions**
1. Create `docs/ANTI_PATTERNS.md` (seed with known NFL patterns)
2. Create `HANDOFF_PROMPT.md` (single-file handoff)
3. Create `AGENT_LOCK.json` (empty lock registry)
4. Create `docs/GOTCHAS.md` (NFL quirks)
5. See `NFL_EVOLUTION_PLAN.md` Phase 6 section for full details.
