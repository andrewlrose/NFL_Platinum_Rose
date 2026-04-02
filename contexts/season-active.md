# Context Mode: season-active
> **Activated during:** NFL regular season or playoffs when games are in progress.
> **Current window:** Not active (offseason).
> **Expires:** When Super Bowl concludes. Next mode: `offseason`.

---

## Behavioral Rules (enforced when this context is active)

### ALLOWED
- Bug fixes scoped to broken behavior only (no refactor, no cleanup)
- Data pipeline ops: odds ingest, auto-grade, podcast ingest, futures refresh
- Read operations on any file — reading is always allowed
- Agent prompt updates (docs-only agents)
- WORKING-CONTEXT.md updates (data source health, session history)

### RESTRICTED (require creator explicit approval)
- Any edit to `src/` files
- Any edit to `public/` JSON files
- Any new npm dependency
- Schema changes (localStorage key names)

### FORBIDDEN (no exceptions)
- New features or components
- Refactors outside a bug fix scope
- Architecture changes
- Deploys to production

---

## Agent Behavior Overrides

| Agent | Restriction |
|-------|-------------|
| FEATURE_DEV | Standby — no task intake during season-active |
| CODE_QUALITY | Audit-only, no changes |
| UX_EXPERT | Audit-only, no changes |
| MOBILE_DEV | Standby |
| DEVOPS | Active — data freshness and pipeline health are primary |
| INTEL_AGENT | Active — matchup cards and injury report updates |
| PM | Active — triage only, no new feature task delegation |
| BUG_FIXER | Active — minimal-scope fixes only |
| WEEKLY_BETTING_ANALYST | Active — Sunday slate analysis |

---

## Data Pipeline Commands (available in this mode)
```bash
# GHA pipeline agents run on schedule:
# odds-ingest.yml      — Poll TheOddsAPI, write odds snapshots to Supabase
# nfl-auto-grade.yml   — Poll ESPN scoreboard, grade pending picks
# futures-odds-ingest.yml — Daily futures odds refresh
# podcast-ingest.yml   — Weekly podcast transcription + pick extraction
# pick-extraction.yml  — Promote podcast picks to user_picks table
```
