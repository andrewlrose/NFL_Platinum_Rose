# NFL Platinum Rose — Architecture Evolution Plan
> **Purpose:** Migrate the Platinum Rose governance layer, agent system, and session management from NCAA Basketball Dashboard to NFL Dashboard.  
> **Source project:** `E:\dev\projects\NCAA_Dashboard\ncaa-basketball-dashboard` (branch: alpha)  
> **Target project:** `E:\dev\projects\NFL_Dashboard` (this repo)  
> **Total estimated effort:** ~3–4 focused hours across 6 phases  
> **Dependency order:** Phases must be done in sequence. Each phase unlocks the next.

---

## Why This Migration Matters

The NCAA project built a full governance layer in S115–S120 (Apr 1–2, 2026):
- **Agent routing system** — 18 dev agents + 4 product agents with YAML frontmatter, scope constraints, and trigger-word routing
- **Context modes** — `dev`, `offseason`, `research`, `review`, `season-active` — each mode changes how AI agents behave
- **Pre-commit hook gates** — 6 automated quality checks
- **Rules layer** — sport-agnostic code style, data handling, and testing rules
- **Session management** — single rolling HANDOFF_PROMPT.md + live WORKING-CONTEXT.md (replaces per-session timestamped files)

The NFL project currently has an older handoff pattern (`handoffs/` with timestamped files) and a flat `agents/` directory with no routing, no YAML frontmatter, and no product agent layer. This plan brings it up to parity, with NFL-appropriate adaptations.

---

## Pre-Migration Checklist

Before starting any phase:
- [ ] `git status` clean on NFL Dashboard repo
- [ ] `git pull origin main` — latest NFL state
- [ ] Confirm NCAA source path: `E:\dev\projects\NCAA_Dashboard\ncaa-basketball-dashboard`
- [ ] Have both projects open in separate VS Code windows (or use a terminal diff)
- [ ] Note the NFL hot files (will fill in Phase 1): `App.jsx`, `storage.js`, `picksDatabase.js` equivalents

---

## Phase 1: Governance Foundation
**Time:** ~30 min  
**Deliverables:** SOUL.md, RULES.md, WORKING-CONTEXT.md, TASK_BOARD.md, root AGENTS.md

### 1A. SOUL.md
**Action:** Copy from NCAA + adapt language.  
**Source:** `ncaa-basketball-dashboard/SOUL.md`  
**Key edits:**
- Replace "NCAA basketball is the first sport" → "NFL is the primary sport."
- Keep the entire "What We Build Toward" section — it's 100% sport-agnostic and describes the real architecture vision
- Keep "What We Are Not" verbatim — every principle applies to NFL equally
- Update "autonomous morning briefing" bullet to reference NFL lines/splits/expert picks instead of survivor/G-Unit

> The SOUL.md establishes the project identity and philosophy. AI agents read this to understand WHY the system exists — this is sport-agnostic at its core.

### 1B. RULES.md
**Action:** Copy from NCAA + adapt storage key table.  
**Source:** `ncaa-basketball-dashboard/RULES.md`

**Keep verbatim:**
- All React & Component Rules
- All Testing rules
- Git & Session rules
- All MUST-NEVER rules except NCAA-specific storage key names

**Adapt:**
- Replace NCAA storage key table with NFL storage keys:
  ```
  nfl_splits             → useSchedule.js
  nfl_my_bets            → useBettingCard.js
  pr_picks_v1            → picksDatabase.js (CRITICAL)
  nfl_bankroll_data_v1   → bankroll.js (CRITICAL)
  nfl_futures_portfolio_v1 → futures.js (CRITICAL)
  ```
- Replace `C:\Users\andre\NCAA_Dashboard` stale clone warning with NFL equivalent path if one exists
- Remove `ncaa_survivor_pool_v1` reference
- Keep `etDateStr()` and `fmtPickDate()` rules — NFL also has game time display logic
- Keep `&groups=50` ESPN API rule — NFL scoreboard API has same behavior
- Keep `BASE_URL` and Vite base path rules (NFL Vite base is `/platinum-rose-app/` — same)

### 1C. WORKING-CONTEXT.md
**Action:** Create from scratch using NCAA's structure.  
**Source pattern:** `ncaa-basketball-dashboard/WORKING-CONTEXT.md`  
**What it replaces:** The timestamped `handoffs/` directory pattern (keep old handoffs for reference; stop creating new ones).

This file is the single source of live operational truth. Update it at session close. Sections:
```markdown
# WORKING-CONTEXT.md — NFL Platinum Rose
## Current Mode
## Active Sprint  
## Data Source Health
## Blockers
## Head Commit
## Next Session Priority
```

### 1D. TASK_BOARD.md
**Action:** Create from scratch.  
**Source pattern:** `ncaa-basketball-dashboard/TASK_BOARD.md`  
**Format:** Kanban-style with IN PROGRESS / BACKLOG / DONE / BLOCKED sections, task IDs (F-prefix for features, B-prefix for bugs), and PM agent as sole writer.

### 1E. Root-Level AGENTS.md
**Action:** Create NFL-specific version based on NCAA structure.  
**Conflict note:** NFL currently has `docs/AGENTS.md` (backend agent reference — OddsIngestAgent, etc.). That file is about GHA pipeline agents and should be **renamed to `docs/PIPELINE_AGENTS.md`**. The new root-level `AGENTS.md` is about AI dev/product agent routing — a different concept.

**Dev agent registry (to populate in Phase 3):**  
Same table format as NCAA AGENTS.md, adapted for NFL scope constraints.

---

## Phase 2: Contexts + Hooks + Rules
**Time:** ~20 min  
**Deliverables:** `contexts/` (5 files), `hooks/hooks.json`, `rules/` directory (4 files)

### 2A. contexts/
**Action:** Copy all 5 NCAA files, with minor edits.  
**Source:** `ncaa-basketball-dashboard/contexts/`

| File | Action | Key Edits |
|------|--------|-----------|
| `dev.md` | Copy + adapt | Replace hot files: `App.jsx`, `storage.js`, `picksDatabase.js` for NFL equivalents |
| `offseason.md` | Copy + adapt | Replace "tournament watching" with "draft/free agency window" |
| `research.md` | Copy verbatim | Fully sport-agnostic |
| `review.md` | Copy verbatim | Fully sport-agnostic |
| `season-active.md` | Copy + adapt | Replace "tournament lock window" with "NFL game week / Sunday lock window" |

**How they're activated:** Load the relevant context file into chat before starting work. The dev agent reads it to know what behaviors (ALLOWED / RESTRICTED / FORBIDDEN) apply.

### 2B. hooks/hooks.json
**Action:** Copy from NCAA + update hot file names.  
**Source:** `ncaa-basketball-dashboard/hooks/hooks.json`  
**Edits:** Replace NCAA hot file paths with NFL equivalents:
- `src/lib/picksDatabase.js` → `src/lib/storage.js`
- `src/lib/scoresFetcher.js` → appropriate NFL grading file
- Keep all 6 gate types (console.log check, localStorage key check, build check, etc.)

### 2C. rules/common/ (3 files)
**Action:** Copy all 3 verbatim — zero sport-specific content.  
**Source:** `ncaa-basketball-dashboard/rules/common/`
- `coding-style.md` — covers JS/JSX conventions, naming, formatting
- `data-handling.md` — covers localStorage patterns, fetch hygiene, error boundaries
- `testing.md` — covers Vitest + RTL patterns, clock freezing, async patterns

### 2D. rules/javascript/conventions.md
**Action:** Copy verbatim.  
**Source:** `ncaa-basketball-dashboard/rules/javascript/conventions.md`

---

## Phase 3: Dev Agent Architecture
**Time:** ~60 min  
**Deliverables:** `agents/dev/` subdirectory with adapted YAML-frontmatter agent prompts

### The Current Problem
The NFL `agents/` directory is flat: `agents/futures-odds-ingest.js`, `agents/nfl-auto-grade.js`, etc. These are **pipeline agents** (GHA workflows). They stay where they are.

The NCAA `agents/dev/` agents are **AI dev agents** — prompt files that route tasks to specialized assistants. These need to live in `agents/dev/` to keep the two concepts separated.

### Reorganization
```
agents/
  dev/                        ← NEW (AI dev agent prompts)
    PM_PROMPT.md
    BUG_FIXER_PROMPT.md
    ... (18 files)
  product/                    ← NEW (AI product agents)
    tier1/
      BETTING.md
      INTEL.md
  manifests/                  ← NEW
    betting.manifest.json
  futures-odds-ingest.js      ← EXISTING pipeline — leave in place
  nfl-auto-grade.js           ← EXISTING pipeline — leave in place
  odds-ingest.js              ← EXISTING pipeline — leave in place
  pick-extraction.js          ← EXISTING pipeline — leave in place
  podcast-ingest.js           ← EXISTING pipeline — leave in place
```

### Dev Agent File Index

| Agent File | Action | Notes |
|------------|--------|-------|
| `PM_PROMPT.md` | Copy + adapt | Replace NCAA hot files in lock protocol; replace test suite count with NFL count |
| `BUG_FIXER_PROMPT.md` | Copy verbatim | Fully sport-agnostic |
| `FEATURE_DEV_PROMPT.md` | Copy verbatim | Fully sport-agnostic |
| `TEST_ENGINEER_PROMPT.md` | Copy + adapt | Replace Vitest count (NFL is own baseline); remove survivor/bracket test sections |
| `CODE_QUALITY_PROMPT.md` | Copy verbatim | Fully sport-agnostic |
| `CODE_REVIEW_PROMPT.md` | Copy verbatim | Fully sport-agnostic |
| `SECURITY_PROMPT.md` | Copy + adapt | Update Supabase project URL and env var names to NFL |
| `UX_EXPERT_PROMPT.md` | Copy + adapt | Replace NCAA component names with NFL component names |
| `MOBILE_DEV_PROMPT.md` | Copy verbatim | Fully sport-agnostic |
| `DEVOPS_PROMPT.md` | Copy + adapt | Replace overnight_pipeline.js with NFL's GHA workflows; remove survivor references |
| `SESSION_STARTER_PROMPT.md` | Copy + adapt | Update test command, git remote check path |
| `DOCS_PROMPT.md` | Copy + adapt | Update hot doc paths (remove DEVLOG.md → use NFL equivalent) |
| `ANALYST_PROMPT.md` | Copy + adapt | Replace NCAA models with NFL: spread models, totals, DFS; remove KenPom |
| `INTEL_AGENT_PROMPT.md` | Copy + adapt | Replace tournament references with NFL injury report / matchup cards / podcast-ingest |
| `CODE_REVIEW_PROMPT.md` — already listed | — | — |
| **SKIP:** `SURVIVOR_ANALYST_PROMPT.md` | Skip | No survivor pool in NFL season |
| **SKIP:** `BRACKET_ANALYST_PROMPT.md` | Skip | No bracket in NFL |
| **SKIP:** `TOURNAMENT_BETTING_ANALYST_PROMPT.md` | Skip | NCAA-specific; NFL analog is a new WEEKLY_BETTING_ANALYST |
| **SKIP:** `TEAM_DOSSIER_AGENT_PROMPT.md` | Adapt → create new | NFL dossiers need different fields (53-man roster, snap counts, injury designations) |

**New agents to CREATE for NFL (no NCAA equivalent):**
- `WEEKLY_BETTING_ANALYST_PROMPT.md` — Sunday slate betting: best bets, teasers, round robins, correlated parlays
- `DFS_LINEUP_AGENT_PROMPT.md` — DraftKings/FanDuel NFL lineup construction (Phase 3 per ROADMAP)
- `PROPS_AGENT_PROMPT.md` — Player props, SGPs, backup-depth analysis (Phase 3 per ROADMAP)

---

## Phase 4: Product Agent Layer
**Time:** ~30 min  
**Deliverables:** `agents/product/tier1/`, `agents/manifests/`

### Tier 1 Agents (chat-based product agents)

| Agent | Source | Action | Notes |
|-------|--------|--------|-------|
| `BETTING.md` | NCAA BETTING.md | Copy + adapt | Replace survivor/bracket tools with NFL-specific tools: `get_spread`, `get_totals`, `get_props_lines`, `get_injury_report`, `calculate_teaser`, `log_bet` |
| `INTEL.md` | NCAA INTEL.md | Copy + adapt | Replace tournament references; source is PodcastIngestAgent + `podcast_transcripts` table |
| **SKIP:** `SURVIVOR.md` | — | Skip | Not relevant for NFL regular season |
| **SKIP:** `CONTEST.md` | — | Skip for now | Could be adapted for survivor pools if user runs one during playoffs |

**New Tier 1 agent to create:**
- `DFS.md` — DraftKings/FanDuel lineup agent (when Phase 3 DFS_OPTIMIZER is built)

### manifests/
**Action:** Adapt NCAA `betting.manifest.json` for NFL scope.  
**Key changes:**
- Tool names: replace `get_ncaa_game`, `get_bracketology` with `get_nfl_game`, `get_schedule_week`
- Remove survivor/bracket tools
- Add `get_injury_report` tool (links to NFL players table in Supabase)
- Update context files reference (`contexts/season-active.md` stays the same name)

---

## Phase 5: CLAUDE.md Consolidation
**Time:** ~45 min  
**Deliverables:** Updated `CLAUDE.md` in NFL project root

### Current State
The NFL `CLAUDE.md` is a well-maintained file with:
- Vite base path rules
- Environment variable catalog
- Tab routing table
- localStorage keys (comprehensive)
- Storage architecture (sync pattern)

### Missing vs NCAA CLAUDE.md
The following sections exist in NCAA CLAUDE.md but are **absent from NFL CLAUDE.md**. Add these:

**1. Orchestration Directives block**
```markdown
## Orchestration Directives
1. **Agent-first**: Route work to the specialist agent. See `AGENTS.md` routing guide.
2. **Context check**: Read `WORKING-CONTEXT.md` at session start.
3. **Rules are laws**: `RULES.md` must-never rules require Creator approval to override.
4. **Anti-patterns are supreme**: Read `docs/ANTI_PATTERNS.md` before touching dates, team names, storage keys, or scoring logic.
5. **Hot files require PM lock**: `App.jsx`, `storage.js`, `picksDatabase.js`, `CLAUDE.md`, `AGENT_LOCK.json`
```

**2. Self-Improvement Rule**
```markdown
## Self-Improvement Rule
After ANY user correction: immediately add a new entry to `docs/ANTI_PATTERNS.md`. Don't wait for session close.
```

**3. Session Protocols section** (current NFL CLAUDE.md lacks canonical resume command format)
```markdown
## Resume Command Format (Gen-4 canonical)
Resume Platinum Rose NFL. HEAD = {commit} ({branch}). Suite: {N/N}. {one-sentence state}. Next: {task}. Read HANDOFF_PROMPT.md for full context before touching any file.
```

**4. Custom /handoff command definition**  

**5. Context Management section** (subagent rules — replicate NCAA version)

**6. The ANTI_PATTERNS.md trigger**
- Add it to existing Key Commands section: `# See docs/ANTI_PATTERNS.md before touching dates, team names, or storage keys`

### NFL-Specific CLAUDE.md rules to strengthen
- The Vite `BASE_URL` rule is already present — good. Add it to RULES.md MUST-ALWAYS as well.
- The `loadFromStorage`/`saveToStorage` direct-access ban deserves its own rule entry in RULES.md.
- Document the `PR_STORAGE_KEYS` catalog approach — all new storage keys must be added to that catalog before first use.

---

## Phase 6: NFL-Specific Additions
**Time:** Ongoing  
**Deliverables:** New docs and tools that have no NCAA equivalent

### 6A. docs/ANTI_PATTERNS.md
**Action:** Create. No NCAA equivalent — NCAA built this over time from AI corrections.  
**Seed with known NFL-specific patterns:**
- `BASE_URL 404`: Never use hardcoded `/filename.json` — always `${import.meta.env.BASE_URL}filename.json`
- `localStorage direct access`: Never call `localStorage.setItem()` directly — always use `saveToStorage()` from `src/lib/storage.js`
- `ESPN groups=50`: Always include `&groups=50` in ESPN scoreboard API calls or only top-25 games return
- `Vite base path`: All public file references must use `import.meta.env.BASE_URL` prefix, not bare `/`

### 6B. HANDOFF_PROMPT.md
**Action:** Create. Replace the `handoffs/YYYY-MM-DD_HH-MM.md` pattern.  
**Principle:** One file, always current. Overwrite on every session close. The `handoffs/` directory can be archived (move to `docs/archive/handoffs/`) — it's useful historical context but shouldn't be the active handoff mechanism.

### 6C. AGENT_LOCK.json
**Action:** Create at project root.  
**Source:** `ncaa-basketball-dashboard/AGENT_LOCK.json` — copy verbatim.  
**Purpose:** File-level mutex — prevents two agents from editing the same file simultaneously. PM is the sole writer. Initialize with empty `locks: []`.

### 6D. docs/GOTCHAS.md
**Action:** Create. No current equivalent.  
**Seed with known NFL quirks from CLAUDE.md inline notes:**
- TheOddsAPI 500-request/month limit (free plan) — track usage
- Groq 7200 sec/hr rate limit — AssemblyAI fallback triggers automatically
- `podcast_transcripts.picks_promoted_at = NULL` means transcript hasn't been promoted — safe to retry
- Supabase `user_picks` `source='EXPERT'` rows come from pipeline; `source='USER'` from browser

### 6E. scripts/gen_resume.js
**Action:** Port from NCAA (with NFL adaptations).  
**Source:** `ncaa-basketball-dashboard/scripts/gen_resume.js`  
**What it does:** Reads current HEAD commit, test count, branch — prints canonical resume command to terminal.  
**NFL edits:** Update project name prefix, update test runner check, update branch name if different from `alpha`.  
Add to `package.json` scripts: `"resume": "node scripts/gen_resume.js"`

---

## Conflict Resolution Table

Where NFL already has a file that conflicts with the NCAA version:

| Existing NFL File | NCAA Equivalent | Resolution |
|-------------------|----------------|------------|
| `docs/AGENTS.md` | root `AGENTS.md` | **Rename NFL file** to `docs/PIPELINE_AGENTS.md`. Create new root `AGENTS.md` for AI agent routing. |
| `docs/HANDOFF.md` | `HANDOFF_PROMPT.md` | NFL file is a general handoff template. Create `HANDOFF_PROMPT.md` at root as the rolling session handoff. Keep `docs/HANDOFF.md` as the template. |
| `docs/ARCHITECTURE.md` | (no NCAA equivalent) | Keep as-is. It's NFL-specific architecture — add a pointer from `CLAUDE.md` to it. |
| `docs/ROADMAP.md` | `ROADMAP.md` (NCAA root) | Keep NFL `docs/ROADMAP.md` as-is. Create root `ROADMAP.md` as a brief status pointer to `docs/ROADMAP.md`. |
| `CLAUDE.md` | `CLAUDE.md` (NCAA) | **Merge** (Phase 5). NFL CLAUDE.md is the base; add missing sections from NCAA. Do NOT replace — too many NFL-specific rules would be lost. |
| `contexts/` | (doesn't exist yet) | Create fresh. NFL will have same 5 context files with NFL adaptations. |
| `agents/*.js` (pipeline) | `agents/dev/` (dev prompts) | Different things. Keep pipeline agents at `agents/*.js`. Create `agents/dev/` subdir alongside them. |

---

## Execution Sequence

The phases above must be done in order to avoid broken cross-references:

```
Phase 1: Foundation docs (SOUL, RULES, WORKING-CONTEXT, TASK_BOARD, AGENTS)
    ↓
Phase 2: Contexts, hooks, rules (behavioral layer)
    ↓
Phase 3: Dev agent prompts (agents/dev/* — now have rules + context to reference)
    ↓
Phase 4: Product agents + manifests (need dev agents to exist first)
    ↓
Phase 5: CLAUDE.md merge (final consolidation — cites all phase 1-4 artifacts)
    ↓
Phase 6: New NFL-specific docs (ongoing — ANTI_PATTERNS, GOTCHAS, gen_resume)
```

---

## Complete File Index

> For each file: **Source** → **Target** → **Action**

### Verbatim Copy
| Source | Target |
|--------|--------|
| `ncaa/rules/common/coding-style.md` | `nfl/rules/common/coding-style.md` |
| `ncaa/rules/common/data-handling.md` | `nfl/rules/common/data-handling.md` |
| `ncaa/rules/common/testing.md` | `nfl/rules/common/testing.md` |
| `ncaa/rules/javascript/conventions.md` | `nfl/rules/javascript/conventions.md` |
| `ncaa/contexts/research.md` | `nfl/contexts/research.md` |
| `ncaa/contexts/review.md` | `nfl/contexts/review.md` |
| `ncaa/agents/dev/BUG_FIXER_PROMPT.md` | `nfl/agents/dev/BUG_FIXER_PROMPT.md` |
| `ncaa/agents/dev/FEATURE_DEV_PROMPT.md` | `nfl/agents/dev/FEATURE_DEV_PROMPT.md` |
| `ncaa/agents/dev/CODE_QUALITY_PROMPT.md` | `nfl/agents/dev/CODE_QUALITY_PROMPT.md` |
| `ncaa/agents/dev/CODE_REVIEW_PROMPT.md` | `nfl/agents/dev/CODE_REVIEW_PROMPT.md` |
| `ncaa/agents/dev/MOBILE_DEV_PROMPT.md` | `nfl/agents/dev/MOBILE_DEV_PROMPT.md` |
| `ncaa/AGENT_LOCK.json` | `nfl/AGENT_LOCK.json` |

### Copy + Adapt (Minor)
| Source | Target | Primary Edit |
|--------|--------|-------------|
| `ncaa/SOUL.md` | `nfl/SOUL.md` | Sport references: NCAA basketball → NFL |
| `ncaa/RULES.md` | `nfl/RULES.md` | Storage key table → NFL keys |
| `ncaa/contexts/dev.md` | `nfl/contexts/dev.md` | Hot files → NFL equivalents |
| `ncaa/contexts/season-active.md` | `nfl/contexts/season-active.md` | Tournament window → NFL game week |
| `ncaa/contexts/offseason.md` | `nfl/contexts/offseason.md` | Tournament/March Madness → draft/free agency |
| `ncaa/hooks/hooks.json` | `nfl/hooks/hooks.json` | Hot file paths → NFL |
| `ncaa/agents/dev/PM_PROMPT.md` | `nfl/agents/dev/PM_PROMPT.md` | Hot files, test count, lock list |
| `ncaa/agents/dev/TEST_ENGINEER_PROMPT.md` | `nfl/agents/dev/TEST_ENGINEER_PROMPT.md` | Remove bracket/survivor test sections |
| `ncaa/agents/dev/SECURITY_PROMPT.md` | `nfl/agents/dev/SECURITY_PROMPT.md` | NFL Supabase URL + env vars |
| `ncaa/agents/dev/UX_EXPERT_PROMPT.md` | `nfl/agents/dev/UX_EXPERT_PROMPT.md` | Component name references |
| `ncaa/agents/dev/DEVOPS_PROMPT.md` | `nfl/agents/dev/DEVOPS_PROMPT.md` | Replace overnight_pipeline → GHA workflows |
| `ncaa/agents/dev/SESSION_STARTER_PROMPT.md` | `nfl/agents/dev/SESSION_STARTER_PROMPT.md` | Repo path, test command |
| `ncaa/agents/dev/DOCS_PROMPT.md` | `nfl/agents/dev/DOCS_PROMPT.md` | DEVLOG.md → NFL equivalent |
| `ncaa/agents/dev/ANALYST_PROMPT.md` | `nfl/agents/dev/ANALYST_PROMPT.md` | Remove KenPom; add NFL splits/DFS |
| `ncaa/agents/dev/INTEL_AGENT_PROMPT.md` | `nfl/agents/dev/INTEL_AGENT_PROMPT.md` | Tournament → injury report + podcast |
| `ncaa/agents/product/tier1/BETTING.md` | `nfl/agents/product/tier1/BETTING.md` | Tool list: add NFL, remove survivor |
| `ncaa/agents/product/tier1/INTEL.md` | `nfl/agents/product/tier1/INTEL.md` | Source references → podcast_transcripts |
| `ncaa/agents/manifests/betting.manifest.json` | `nfl/agents/manifests/betting.manifest.json` | Tool names → NFL |

### Skip (NCAA-Only)
| File | Reason |
|------|--------|
| `ncaa/agents/dev/SURVIVOR_ANALYST_PROMPT.md` | No survivor pool in NFL regular season |
| `ncaa/agents/dev/BRACKET_ANALYST_PROMPT.md` | No bracket |
| `ncaa/agents/dev/TOURNAMENT_BETTING_ANALYST_PROMPT.md` | NCAA tournament-specific |
| `ncaa/agents/dev/TEAM_DOSSIER_AGENT_PROMPT.md` | Adapt from scratch — NFL dossiers are fundamentally different |
| `ncaa/agents/product/tier1/SURVIVOR.md` | No survivor pool |
| `ncaa/agents/product/tier1/CONTEST.md` | No contest equivalent yet |
| `ncaa/agents/manifests/survivor.manifest.json` | No survivor pool |
| `ncaa/agents/manifests/contest.manifest.json` | No contest equivalent |
| `ncaa/scripts/overnight_pipeline.js` | NCAA tournament-specific; NFL will build its own |
| `.mcp.json` | Review NCAA version; adapt for NFL Supabase project URL + relevant tools only |

### Create New for NFL (no NCAA equivalent)
| Target | Purpose |
|--------|---------|
| `HANDOFF_PROMPT.md` | Rolling session handoff (replaces `handoffs/` pattern) |
| `WORKING-CONTEXT.md` | Live operational state file |
| `TASK_BOARD.md` | PM-managed kanban |
| `AGENTS.md` | AI agent routing registry |
| `AGENT_LOCK.json` | File-mutex for agent coordination |
| `docs/ANTI_PATTERNS.md` | Corrections → permanent rules |
| `docs/GOTCHAS.md` | NFL-specific quirks and traps |
| `agents/dev/WEEKLY_BETTING_ANALYST_PROMPT.md` | Sunday slate betting agent |
| `agents/dev/NFL_DOSSIER_AGENT_PROMPT.md` | NFL team dossier builder |

---

## Status Tracking

Use this table to track progress as you work through the plan:

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Foundation | ✅ Complete | SOUL.md, RULES.md, WORKING-CONTEXT.md, TASK_BOARD.md, AGENTS.md — 2026-04-02 |
| Phase 2: Contexts + Rules | ⬜ Not started | |
| Phase 3: Dev Agents | ⬜ Not started | |
| Phase 4: Product Agents | ⬜ Not started | |
| Phase 5: CLAUDE.md merge | ⬜ Not started | |
| Phase 6: NFL Additions | ⬜ Ongoing | ANTI_PATTERNS seeds written above |

---

*Generated: 2026-04-02 | Source: NCAA Basketball Dashboard S115–S120 governance layer*
