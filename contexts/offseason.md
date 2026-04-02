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
- Removing critical storage keys (`pr_picks_v1`, `nfl_bankroll_data_v1`, `nfl_futures_portfolio_v1`, `nfl_expert_consensus`)

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

- [ ] Complete governance migration (Phases 2–6 from NFL_EVOLUTION_PLAN.md)
- [ ] Agent Chat POC (BETTING agent)
- [ ] DFS/Props agent infrastructure
- [ ] Weekly Betting Analyst agent prompt
- [ ] Bundle size audit + optimization
