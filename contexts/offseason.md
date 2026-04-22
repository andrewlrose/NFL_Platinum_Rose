# Context Mode: offseason

> **Activated during:** NFL offseason development window.
> **Current window:** Post-Super Bowl → NFL preseason start (est. August 2026).
> **Next mode:** `season-active` when NFL preseason begins.

---

## Behavioral Rules (enforced when this context is active)

### ALLOWED

- All feature development within PM-scoped plan
- Architecture changes — `src/core/`, `src/sports/` module split
- Refactoring — including breaking changes with migration helpers
- New npm dependencies (after PM approval)
- Multi-sport infrastructure development
- localStorage key migrations (with backward-compat helper required)
- New agent development (`agents/product/tier1/`, `agents/product/tier2/`)
- Deploys to production (with test gate)

### RESTRICTED

- Breaking API changes to existing localStorage schema without migration
- Deleting `src/` files without PM task brief

### FORBIDDEN

- Pushing directly to `main` without creator approval
- Releasing without passing test suite
- Removing critical storage keys (`pr_picks_v1`, `nfl_bankroll_data_v1`, `nfl_futures_portfolio_v1`, `nfl_expert_consensus`, `nfl_props_picks_v1`)

---

## Agent Behavior Overrides

| Agent | Mode |
|-------|------|
| FEATURE_DEV | Fully active — governance migration + new features |
| CODE_QUALITY | Active — debt audit + dead code removal |
| UX_EXPERT | Active — design system, accessibility pass |
| MOBILE_DEV | Active — responsive conversion pass |
| DEVOPS | Maintenance mode — pipeline not real-time |
| TEST_ENGINEER | Active — maintain test baseline as architecture evolves |
| PM | Active — phase orchestration |

---

## Offseason Priority Checklist

- [x] Complete governance migration (Phases 2–6 from NFL_EVOLUTION_PLAN.md)
- [x] Agent Chat POC — BETTING agent (F-6, 2026-04-02)
- [x] DFS agent infrastructure — F-7 DFS Lineup Optimizer (2026-04-02)
- [x] Props agent infrastructure — F-8 PROPS agent (2026-04-17; prop lines stubbed until paid TheOddsAPI tier)
- [ ] Weekly Betting Analyst Tier-1 agent (F-9, next)
- [ ] Bundle size audit + optimization
- [ ] Props auto-grade pipeline agent (future F-10)
- [ ] Python scripts season bump to 2026 (deferred until late-August 2026 — data availability)
