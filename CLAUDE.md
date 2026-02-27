# CLAUDE.md - AI Assistant Guidelines for NFL Platinum Rose

## Project Overview
NFL betting analytics and line shopping dashboard (React + Vite + Tailwind CSS).
Integrates real-time odds from 8 sportsbooks, tracks betting performance, manages expert picks, and provides simulation-based edge analysis.

**Repository**: https://github.com/andrewlrose/NFL_Platinum_Rose
**Workspace**: `E:\dev\projects\NFL_Dashboard`
**Dev URL**: http://localhost:5173/platinum-rose-app/

## Key Commands
```bash
npm run dev              # Start dev server (Vite)
npm run build            # Production build
npm run preview          # Preview production build
npm run lint             # ESLint
npm run update-schedule  # Refresh schedule.json from external source
```

## File Structure Conventions
- Components: `src/components/{category}/{ComponentName}.jsx`
- Utils/libs: `src/lib/{utilName}.js`
- Data files: `public/*.json`
- Modals: `src/components/modals/{ModalName}Modal.jsx`
- Static JSON data: `src/lib/*.json` (ratings, projections, prop lines)
- Test utilities: root `test-*.js` files (Node.js scripts, not browser)
- Python scripts: `scripts/*.py`

## Vite Config
- **Base path**: `/platinum-rose-app/` (GitHub Pages deployment)
- **Alias**: `@` → `./src`
- **Public files**: NEVER use hardcoded `/filename.json` — Vite base is `/platinum-rose-app/` so `public/` files must be fetched as relative `./filename.json`. Hardcoded `/` prefix 404s.

## Environment Variables
```
VITE_ODDS_API_KEY=...       # TheOddsAPI key (500 requests/month on free plan)
VITE_OPENAI_API_KEY=...     # OpenAI API key (for transcript analysis)
```
Accessed via `import.meta.env.VITE_*` in browser code. Fallbacks exist in `api.js`.

## Tab Routing (App.jsx)
| `activeTab` | Component |
|-------------|-----------|
| `'dashboard'` | `<Dashboard>` — Main matchup card grid |
| `'standings'` | `<Standings>` — Expert leaderboard |
| `'mycard'` | `<MyCardModal>` — Personal betting card |
| `'devlab'` | `<DevLab>` — Monte Carlo simulation lab |
| `'bankroll'` | `<BankrollDashboard>` — Bankroll management |
| `'analytics'` | `<AnalyticsDashboard>` — Performance analytics |
| `'odds'` | `<OddsCenter>` — Live odds + line movements |
| `'picks'` | `<PicksTracker>` — Pick tracking + grading |

## localStorage Keys
| Key | Purpose | Managed By |
|-----|---------|-----------|
| `nfl_splits` | Action Network betting splits | App.jsx |
| `nfl_my_bets` | User's betting card | App.jsx |
| `nfl_sim_results` | Dev Lab simulation results | App.jsx |
| `nfl_contest_lines` | Contest line overrides | App.jsx |
| `nfl_expert_consensus` | Expert pick consensus per game | App.jsx |
| `pr_picks_v1` | Picks tracker data | picksDatabase.js |
| `pr_game_results_v1` | Cached game results for grading | picksDatabase.js |
| `nfl_bankroll_data_v1` | Bankroll bet data | bankroll.js |
| `platinum_rose_bets_v17` | Legacy bets storage key | constants.js |
| `platinum_rose_ratings` | Team ratings cache | DevLabModal.jsx |
| `cached_odds_data` | Cached API odds response | LiveOddsDashboard.jsx |
| `cached_odds_time` | Cache timestamp for odds | LiveOddsDashboard.jsx |
| `lineMovements` | Historical line movement data | enhancedOddsApi.js |
| `PR_OPENAI_KEY` | User-provided OpenAI key | AudioUploadModal.jsx |

**IndexedDB**: `NFLDashboardDB` → object store `transcripts` (in db.js)

**Rule**: NEVER change localStorage key names without a migration helper. Old data becomes invisible.

## API Integrations
| API | Endpoint | Usage |
|-----|----------|-------|
| **TheOddsAPI** | `api.the-odds-api.com/v4/sports/americanfootball_nfl/odds` | Live odds from 8 sportsbooks |
| **OpenAI** | `api.openai.com/v1/chat/completions` | GPT-4o transcript → picks extraction |
| **ESPN Injuries** | `site.api.espn.com/.../teams/{ID}/injuries` | NFL team injury reports |
| **GitHub Raw** | `raw.githubusercontent.com/andrewlrose/NFL_Platinum_Rose/main/betting_splits.json` | Splits data sync |
| **Local** | `./schedule.json`, `./weekly_stats.json` | Schedule + stats from `public/` |

### TheOddsAPI Rate Limits (CRITICAL)
- Free plan: **500 requests/month**
- Auto-refresh is DISABLED (was burning 30 calls/hour)
- Startup fetch is DISABLED (every browser refresh = 1 call)
- 10-minute caching layer in LiveOddsDashboard.jsx
- Only fetches when user explicitly clicks Sync or visits Odds tab
- Use `monitor-api-usage.js` in browser console to track usage

## Sportsbooks Integrated
DraftKings, FanDuel, BetMGM, Caesars, BetOnline, Bookmaker, PointsBet, Unibet

---

## Workflow & Process

### Plan Before You Build
- For any task with 3+ steps, or touching data pipelines/storage: write out the steps before touching code
- If implementation goes sideways: STOP and re-plan — don't keep pushing through a bad path
- Always ask "What can go wrong with data formats or hook ordering?" before starting changes to App.jsx

### Autonomous Bug Fixing
- When given a bug report: just fix it. Point at logs/errors, resolve them, confirm the fix
- Check console errors, localStorage state, and network responses before concluding a root cause

### Verification Gate
- A task is **not done** until it is proven to work — check console, verify UI behavior, confirm localStorage state
- For grading/scoring changes: manually verify at least one bet grades correctly end-to-end

### Self-Improvement Rule
- After ANY user correction: immediately update the Anti-Patterns section of this file with the new lesson
- Don't wait — capture it while it's fresh
- Pattern format: `**Bold title**: What went wrong, why, and the rule to avoid it`

### Context Management
Context is a finite resource — preserve it by delegating exploration and research to subagents.

**Default to spawning a subagent for:**
- Codebase orientation (reading 3+ files to answer a question)
- Research tasks (web searches, doc lookups, investigating how something works)
- Code review or analysis that produces verbose output
- Any investigation where only the summary matters

**Stay in main context for:**
- Direct file edits the user requested
- Short, targeted reads (1–2 files)
- Conversations requiring back-and-forth
- Tasks where the user needs to see intermediate steps

**Rule of thumb:** If a task will read more than ~3 files or produce output the user doesn't need verbatim, delegate it to a subagent and return a summary.

**Subagent best practices:**
- Include relevant localStorage keys, data formats, and file paths in the prompt — subagents don't inherit CLAUDE.md
- Don't subagent a 1-file read that returns a short answer — spawning overhead > just reading it
- Batch related investigations into one subagent instead of 3 separate spawns
- Never subagent an edit that depends on uncommitted changes from earlier in the conversation — the subagent can't see them

---

## Component Architecture Notes

### App.jsx — Central Hub
- All top-level state lives here (30+ useState calls)
- No custom hooks — all logic is inline
- Persistence: `loadFromStorage`/`saveToStorage` helpers with auto-save useEffects
- `gamesWithSplits` computed array merges schedule + splits + expertConsensus + injuries + contestLines
- `findGameForTeam(rawInput)` — 3-tier matching: alias dict → direct abbreviation → substring
- `handleAIAnalyze` — OpenAI transcript analysis → staged picks → review modal → confirm
- `handleBulkImport` — Action Network splits parser with flexible team matching
- Boot sequence: `Promise.all([schedule, empty-odds, stats, splits])` → merge → fetch injuries

### Team Database (teams.js)
- 32 NFL teams with logos, abbreviations, aliases
- `TEAM_ALIASES` — maps common names/abbreviations to standard names
- `NAME_MAP` — used by actionParser.js for splits matching
- `normalizeTeam(input)` — returns canonical team name
- `getTeamLogo(team)` — returns ESPN CDN logo URL
- `getDomeTeams()` — returns set of indoor teams

### Picks System (picksDatabase.js)
- `STORAGE_KEY = 'pr_picks_v1'` / `RESULTS_KEY = 'pr_game_results_v1'`
- Sources: `'AI_LAB'`, `'GUNIT'`
- Types: `'spread'`, `'total'`
- Results: `'WIN'`, `'LOSS'`, `'PUSH'`, `'PENDING'`
- Confidence stored as whole numbers (57), not decimals (0.57)
- `addPick()` → `loadPicks()` → `gradeGame(gameId, homeScore, visitorScore)` → `calculateStandings()`
- `statsByConfidence()` / `statsByEdge()` — bucket analysis
- `findStalePicksPending()` — picks older than threshold with no grade

### Bankroll System (bankroll.js)
- `STORAGE_KEY = 'nfl_bankroll_data_v1'`
- Full CRUD for bets with status tracking (OPEN, PLACED, WIN, LOSS, PUSH)
- Unit sizing calculator
- P&L analytics

---

## Learnings & Gotchas

### Props & State
- Always verify prop names match between parent and child
- When adding new Header props, update both Header.jsx AND App.jsx simultaneously
- Default prop values prevent undefined errors: `schedule = []`, `edges = []`

### Data Formats
- Confidence values: Store as whole numbers (57), not decimals (0.57)
- G-Unit edges: Nested structure with `spreadEdge`/`totalEdge` objects, not flat properties
- Stats for MatchupWizardModal: Must be ARRAY format, not object
- Convert with: `Object.entries(obj).map(([team, data]) => ({team, ...data}))`

### API & Network
- TheOddsAPI returns games, transform to schedule format in merge logic
- Always add safety checks: `if (!schedule || !Array.isArray(schedule)) return`
- 404 errors on GitHub raw URLs: Use local files or remove fetch
- GitHub splits URL: `https://raw.githubusercontent.com/andrewlrose/NFL_Platinum_Rose/main/betting_splits.json`

### Component Patterns
- Modal props pattern: `isOpen`, `onClose`, `onAction`
- Tab rendering: Use `{activeTab === 'tabname' && <Component />}`
- Always import new components AND add to render
- Before displaying parsed data, verify actual object structure from parser (console.log the object)

---

## Anti-Patterns to Avoid

- **API auto-refresh burning quota**: Never use `setInterval(loadOdds, N)` for rate-limited APIs. The LiveOddsDashboard was firing every 2 minutes, burning 30 calls/hour. Auto-refresh is now disabled; only manual fetch. Always cache API responses in localStorage with a TTL check.

- **Startup API fetch on every refresh**: `fetchLiveOdds()` in the boot `useEffect` called the API on every page load. Now replaced with `Promise.resolve([])`. Only fetch on explicit user action.

- **Don't assume GitHub raw URLs exist**: Verify the file exists in the repo before adding a fetch. 404s degrade silently.

- **Don't change storage keys without data migration**: Old key: `ncaa_picks_database` → New key: `pr_picks_v1`. Always check both keys when debugging "missing data".

- **Don't use `.map()` on potentially undefined arrays**: Always default: `(arr || []).map(...)`.

- **UTC commence_time +1 day offset**: API timestamps are UTC ISO strings. 7pm ET games store as `"2026-02-19T00:00:00Z"` (midnight UTC = next day). Using `.split('T')[0]` produces a date one day ahead. Fix: convert to local timezone before extracting date string.

- **Date-only string display UTC trap**: `new Date("2026-02-25").toLocaleDateString()` renders as 2/24 in ET because JS parses `YYYY-MM-DD` as midnight UTC. Always append `T12:00:00` or use timezone-aware formatting when displaying date strings.

- **GPT total selection casing**: GPT-4o returns `"OVER"`/`"UNDER"` in all-caps, not `"Over"`/`"Under"`. Always use `.toLowerCase()` when checking for total picks.

- **O(n²) lookups in loops**: Never call a `.find()` inside `.map()` — pre-build a `Map` keyed by the lookup field for O(1) access.

- **NCAA content in NFL project**: The `gunitParser.js` `TEAM_NORMALIZE` map contains NCAA basketball teams (UNC, UConn, Ole Miss, etc.). This needs to be replaced with NFL team names. The `test-picks-database.js` and `test-standings-accuracy.js` files also reference NCAA localStorage keys.

- **Hook TDZ ordering**: Never call a hook that receives a `const fn = () =>` callback BEFORE that `const` declaration in the same component body. `const` is NOT hoisted. Move the hook call BELOW the function definition. Symptom: `ReferenceError: Cannot access 'X' before initialization`.

- **Public file fetches**: NEVER use hardcoded `/filename.json`. Vite base is `/platinum-rose-app/` so `public/` files must be fetched as `./filename.json` or `` `${import.meta.env.BASE_URL}filename.json` ``. Hardcoded `/` prefix 404s in production.

- **React.memo comparator must match actual prop names**: If comparator checks `g1.overUnder` but the game object uses `g1.total`, field changes are invisible to the memo. Always verify field names match the actual data object.

- **Bankroll bet ID type mismatch**: Bet IDs are created as `Date.now()` (number) but filtering may use string comparison. Always normalize: `const sids = new Set([...ids].map(String))` and filter with `!sids.has(String(b.id))`.

- **ReviewPicksModal Context field**: `handleAIAnalyze` creates picks with `rationale: p.summary || p.rationale || p.analysis` — GPT never returns `analysis` directly, so `pick.analysis` is always undefined. The "Context" field must read `pick.rationale`.

---

## Testing Checklist
> **Verification gate** — run after changes to App.jsx, storage logic, or parsers. A task is not done until relevant items pass.
- [ ] App boots without console errors
- [ ] Dashboard loads schedule and displays matchup cards
- [ ] Sync Odds loads data without burning extra API calls
- [ ] G-Unit import parses and shows edges
- [ ] Picks Tracker loads picks from localStorage
- [ ] All 8 tabs render without crashing
- [ ] Bulk import (Action Network) parses and updates splits
- [ ] AI transcript analysis extracts and stages picks
- [ ] Bankroll bet entry saves to localStorage

---

## Agent System — Future Architecture

### Planned Agents (adapted from NCAA project)
| Agent | Purpose | Priority |
|-------|---------|----------|
| **OddsIngestAgent** | Poll TheOddsAPI on schedule, cache odds + line snapshots | HIGH |
| **NFLAutoGradeAgent** | Poll ESPN NFL scoreboard, grade pending picks automatically | HIGH |
| **GUnitAgent** | Download G-Unit spreadsheet, parse edges (fix NCAA team map first) | MEDIUM |
| **PodcastIngestAgent** | Extract NFL picks from podcast RSS feeds via PickExtractionAgent | MEDIUM |
| **PickExtractionAgent** | Shared AI extraction backbone — sport-agnostic | MEDIUM |
| **TwitterIngestAgent** | Extract NFL picks from bookmarked tweets | LOW |
| **AgentScheduler** | Cron orchestrator for all agents | MEDIUM |

### Planned Hooks
| Hook | Purpose |
|------|---------|
| `useAutoGrade` | Auto-grade picks when games finish (ESPN NFL scoreboard) |
| `useAutoLoad` | "Full Morning Load" — fetch edges + run sims + build picks in one click |
| `useExpertInbox` | Bridge Node.js agents → browser state for expert picks |
| `useMatchupIntel` | Surface podcast analysis on MatchupCards |

### Agent Design Principles (from NCAA)
- Set `maxRetries` / `maxRunTimeMs` on every agent
- Validate agent output schemas before writing to `public/` or localStorage
- Agents report structured errors — never swallow in try/catch
- File system memory (`public/*.json`) is the coordination mechanism — no direct agent-to-agent state
- All agents degrade gracefully: no config = local-only behavior unchanged

---

## Unfinished Features (Priority Order)

### Priority 1 — Core
1. **Arbitrage Finder** — Structure exists in OddsCenter, logic ready in enhancedOddsApi.js
2. **Steam Move Tracker** — Structure exists, line movement data available
3. **Bet Value Comparison** — Compare user bets vs current market odds
4. **Line Movement Alerts** — Notification system for favorable movements

### Priority 2 — Enhancement
5. Historical line charts (TradingView-style)
6. Expert picks integration & accuracy tracking
7. Bet outcome tracking dashboard
8. Advanced filtering & sorting
9. Performance analytics (ROI by sportsbook, timing analysis)

### Priority 3 — Infrastructure
10. Cloud sync (Firebase/Supabase)
11. CI/CD pipeline (GitHub Actions)
12. Testing suite (Jest + Cypress)

See [UNFINISHED_FEATURES.md](UNFINISHED_FEATURES.md) for full details with effort estimates.

---

## Style Constants
- Primary accent: `#00d2be` (teal)
- Background: `#0f0f0f`
- AI Lab: emerald (`text-emerald-400`, `bg-emerald-500/20`)
- G-Unit: purple (`text-purple-400`, `bg-purple-500/20`)
- Positive: emerald, Negative: rose, Neutral: amber/slate
- Selection highlight: `selection:bg-[#00d2be] selection:text-black`

## Custom Commands

### /handoff
When the user types `/handoff`, produce two blocks:

1. **Session summary** — Concise bullet-point recap:
   - **CRITICAL**: Anything mid-flight, partially broken, or blocking progress
   - **IMPORTANT**: Features completed, bugs fixed, files changed this session
   - **Blockers / Open Decisions**: Items waiting on user input or external data
   - Known gotchas or traps discovered during the session

2. **Context briefing** — A complete, self-contained block to paste into a fresh chat:
   - Project name, stack, dev URL, workspace path
   - All files modified this session with one-line descriptions
   - Current state of any in-progress work
   - Immediate next steps in priority order
   - Anti-patterns encountered
   - **Resume Command**: One copy-pasteable sentence to pick up exactly where this session left off
