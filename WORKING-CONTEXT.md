# WORKING-CONTEXT.md — NFL Platinum Rose
> **Live operational state. Update this file at every session close.**
> **Read this at session start before touching any file.**
> Last updated: 2026-04-02 | Branch: `main` | HEAD: bf0de90

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
| **Phase 2** | Contexts + Hooks + Rules | 🔴 Not started | contexts/, hooks/hooks.json, rules/ directory |
| **Phase 3** | Dev Agent Architecture | 🔴 Not started | agents/dev/ subdirectory with YAML-frontmatter prompts |
| **Phase 4** | Product Agent Layer | 🔴 Not started | agents/product/tier1/, agents/manifests/ |
| **Phase 5** | CLAUDE.md Consolidation | 🔴 Not started | Orchestration directives, session protocols, anti-patterns trigger |
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
Commit: bf0de90 — Phase 1: Governance foundation (SOUL, RULES, WORKING-CONTEXT, TASK_BOARD, AGENTS)
```

---

## Next Session Priority

**Phase 2: Contexts + Hooks + Rules**
1. Copy and adapt 5 context files from NCAA → `contexts/`
2. Copy and adapt `hooks/hooks.json` quality gate registry
3. Copy 3 verbatim `rules/common/` files + `rules/javascript/conventions.md`

See `NFL_EVOLUTION_PLAN.md` Phase 2 section for full details.
