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
- Python scripts: `scripts/*.py`

## Vite Config
- **Base path**: `/platinum-rose-app/` (GitHub Pages deployment)
- **Alias**: `@` → `./src`
- **Public files**: NEVER use hardcoded `/filename.json` — Vite base is `/platinum-rose-app/` so `public/` files must be fetched as relative `./filename.json`. Hardcoded `/` prefix 404s.

## Environment Variables
```
VITE_ODDS_API_KEY=...          # TheOddsAPI key (500 requests/month on free plan)
VITE_OPENAI_API_KEY=...        # OpenAI API key (for transcript analysis)
VITE_SUPABASE_URL=...          # https://aambmuzfcojxqvbzhngp.supabase.co
VITE_SUPABASE_ANON_KEY=...     # Supabase anon/public JWT (read-only)
```
Accessed via `import.meta.env.VITE_*` in browser code.
Centralized in `src/lib/apiConfig.js` — all endpoints and keys in one file.

### GitHub Actions Secrets (for agents)
| Secret | Value |
|--------|-------|
| `SUPABASE_URL` | https://aambmuzfcojxqvbzhngp.supabase.co |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role JWT (bypasses RLS) |
| `ODDS_API_KEY` | TheOddsAPI key (same as VITE_ODDS_API_KEY) |

Add at: GitHub repo → Settings → Secrets and variables → Actions

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
| `'futures'` | `<FuturesPortfolio>` — Futures positions, exposure, hedge lab |

## localStorage Keys
All keys are catalogued in `PR_STORAGE_KEYS` in `src/lib/storage.js`. Use `loadFromStorage`/`saveToStorage`/`clearStorage` — never call `localStorage` directly.

| Key | Purpose | Permanence | Managed By |
|-----|---------|------------|------------|
| `nfl_splits` | Action Network betting splits | persistent | useSchedule.js |
| `nfl_my_bets` | User's betting card | persistent | useBettingCard.js |
| `nfl_sim_results` | Dev Lab simulation results | persistent | useSchedule.js |
| `nfl_contest_lines` | Contest line overrides | persistent | useSchedule.js |
| `nfl_expert_consensus` | Expert pick consensus per game | **critical** | useExperts.js |
| `pr_picks_v1` | Picks tracker data | **critical** | picksDatabase.js |
| `pr_game_results_v1` | Cached game results for grading | persistent | picksDatabase.js |
| `nfl_bankroll_data_v1` | Bankroll bet data | **critical** | bankroll.js |
| `nfl_futures_portfolio_v1` | Futures positions + open parlays | **critical** | futures.js |
| `cached_odds_data` | Cached API odds response (fallback when Supabase unavailable) | ephemeral | LiveOddsDashboard.jsx |
| `cached_odds_time` | Cache timestamp for odds | ephemeral | LiveOddsDashboard.jsx |
| `lineMovements` | Line movements from in-browser tracking (fallback; Supabase is primary) | ephemeral | enhancedOddsApi.js |
| `PR_OPENAI_KEY` | User-provided OpenAI key | persistent | AudioUploadModal.jsx |

**Permanence rules:**
- **critical** — `removeFromStorage()` is blocked; only explicit user action via StorageBackupModal can clear
- **persistent** — survives refresh; must always be saved even when empty (no length guards)
- **ephemeral** — cache/temp data; safe to wipe

**Rule**: NEVER change localStorage key names without a migration helper. Old data becomes invisible.

## API Integrations
| API | Endpoint | Usage |
|-----|----------|-------|
| **TheOddsAPI** | `api.the-odds-api.com/v4/sports/americanfootball_nfl/odds` | Live odds from 8 sportsbooks |
| **OpenAI** | `api.openai.com/v1/chat/completions` | GPT-4o transcript → picks extraction (via lib/openai.js) |
| **Supabase** | `aambmuzfcojxqvbzhngp.supabase.co` | Persistent storage: odds snapshots, line movements, game results |
| **ESPN Injuries** | `site.api.espn.com/.../teams/{ID}/injuries` | NFL team injury reports |
| **GitHub Raw** | `raw.githubusercontent.com/andrewlrose/NFL_Platinum_Rose/main/betting_splits.json` | Splits data sync |
| **Local** | `./schedule.json`, `./weekly_stats.json` | Schedule + stats from `public/` |

### TheOddsAPI Rate Limits (CRITICAL)
- Free plan: **500 requests/month**
- Auto-refresh is DISABLED (was burning 30 calls/hour)
- Startup fetch is DISABLED (every browser refresh = 1 call)
- 10-minute caching layer in LiveOddsDashboard.jsx
- Only fetches when user explicitly clicks Sync or visits Odds tab

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

### App.jsx — Central Hub (~110 lines)
- Pure wiring layer — imports hooks, destructures, renders JSX
- Only local state: `activeTab`, `selectedGame`
- `gamesWithSplits` cross-cutting `useMemo` (merges data from useSchedule + useExperts)
- 16 modals lazy-mounted with `{modals.x && <Modal />}` — zero DOM overhead when closed
  - Includes: splits, teasers, pulse, contest, audio, review, import, expertMgr, injuryReport, unitCalculator, betEntry, betImport, pendingBets, editBet, gradeModal, bankrollSettings
- All business logic delegated to custom hooks (see below)

### Custom Hooks (src/hooks/)

#### useModals — Modal state reducer
- Single `useReducer` replaces 15 individual `useState` booleans
- `openModal(name)` / `closeModal(name)` — stable refs via `useCallback`
- Associated data: `selectedBetForEdit`, `gradeGameData`, `picksRefreshKey`

#### useSchedule — Boot sequence + data
- Owns: `schedule`, `stats`, `splits`, `injuries`, `loading`, `contestLines`, `simResults`
- Boot `useEffect`: `Promise.all([schedule, empty-odds, stats, splits])` → merge → fetch injuries
- `findGameForTeam(rawInput)` — 3-tier matching: alias dict → abbreviation → substring (`useCallback([schedule])`)
- `handleBulkImport` — Action Network splits parser (`useCallback([splits, schedule, findGameForTeam])`)
- Auto-save effects for `splits`, `simResults`, `contestLines`

#### useExperts — Expert consensus CRUD + AI
- Owns: `expertConsensus`, `stagedPicks`
- Params: `{ schedule, findGameForTeam, openModal, closeModal }`
- `handleAIAnalyze` — GPT-4o transcript → staged picks → toggles audio/review modals
- `handleConfirmPicks` — commits staged picks to consensus (functional updater)
- `handleUpdatePick` / `handleDeletePick` / `handleClearExpert` — stable refs (`useCallback([])`)
- Auto-save effect for `expertConsensus`

#### useBettingCard — Personal betting card
- Owns: `myBets`
- Params: `schedule` (for team name lookup)
- `handleBet`, `removeBet`, `handleLockBets`, `clearBets` — all stable refs
- Auto-save effect for `myBets`

### Storage Manager (src/lib/storage.js)
- `PR_STORAGE_KEYS` — catalog of all 13 keys with `permanence: 'critical' | 'persistent' | 'ephemeral'`
- `CRITICAL_KEYS` — Set of keys blocked from `removeFromStorage()`: expert consensus, picks, bankroll, futures
- `loadFromStorage(key, defaultValue)` / `saveToStorage(key, value)` — try/catch wrappers; used by all hooks and lib files
- `clearStorage(key, emptyValue)` — **NEW:** explicitly writes empty default so clears survive hard refresh
- `removeFromStorage(key)` — blocked for critical keys with console.warn; ephemeral/persistent only
- `exportAppData()` / `downloadBackup()` — dumps all known keys to JSON file (browser download)
- `importAppData(snapshot)` — restores from JSON, only writes known keys (safe against injection)
- `getStorageDiagnostics()` — returns + `console.table()`s all keys with size (KB), count, present status

### StorageBackupModal (src/components/modals/StorageBackupModal.jsx)
- Opened via `Database` icon button in Header toolbar
- Shows diagnostics table: all 13 keys, size, count, permanence badge, present indicator
- Export → triggers `downloadBackup()` file download
- Import → file picker → `importAppData()` → full restore
- Per-key Clear buttons: blocked (ShieldCheck icon shown) for critical keys, confirmation dialog for others

### Supabase Client (src/lib/supabase.js) — NEW
- Browser-side Supabase client (anon/public key, read-only)
- `getLatestOddsSnapshot()` — read most recent agent-written odds; called by LiveOddsDashboard
- `getLineMovementsDB(hours)` — read line movement rows; called by SteamMoveTracker, LineMovementTracker
- `getGameResults({ week, season })` — read game results for optional week/season filter
- `getGameResultsByIds(espnIds)` — look up specific final games by ESPN ID array; called by useAutoGrade
- Falls back gracefully if Supabase is unavailable (no URL/key configured)

### API Config (apiConfig.js) — NEW
- Single source of truth for all API endpoints, keys, and constants
- Exports: `ODDS_API_KEY`, `OPENAI_API_KEY`, `ODDS_API`, `OPENAI_API`, `ESPN_API`, `GITHUB_RAW`, `LOCAL_DATA`
- All env vars read here, not scattered across files

### Constants (constants.js)
- `getNFLWeekInfo()` — derives current NFL week/phase from date (regular season weeks 1-18, playoff rounds, offseason)
- `CURRENT_WEEK` — numeric week derived from `getNFLWeekInfo().week`
- Used by Header.jsx for dynamic week label display

### OpenAI Integration (openai.js) — NEW
- `extractPicksFromTranscript(text, sourceData, availableGames)` — GPT-4o transcript → picks extraction
- Extracted from App.jsx inline `handleAIAnalyze` fetch call
- Returns parsed picks array, throws on API error

### Team Database (teams.js)
- 32 NFL teams with logos, abbreviations, aliases
- `TEAM_ALIASES` — maps common names/abbreviations to standard names
- `TEAM_LOGOS` — comprehensive logo lookup (abbreviation + name + city → URL) — single source of truth, replaces inline maps in MatchupCard/DevLab
- `NAME_MAP` — used by actionParser.js for splits matching
- `normalizeTeam(input)` — returns canonical team name
- `getTeamLogo(team)` — returns ESPN CDN logo URL
- `getTeamAbbreviation(team)` — returns standard abbreviation (used by oddsApi.js)
- `getDomeTeams()` — returns set of indoor teams

### Picks System (picksDatabase.js)
- `STORAGE_KEY = 'pr_picks_v1'` / `RESULTS_KEY = 'pr_game_results_v1'`
- Sources: `'AI_LAB'`
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

### Futures System (futures.js)
- `STORAGE_KEY = 'nfl_futures_portfolio_v1'`
- Data shape: `{ positions: FuturesPosition[], parlays: OpenParlay[] }`
- Types: `playoffs`, `wins`, `division`, `conference`, `superbowl`, `sb_matchup`
- Status: `OPEN`, `WON`, `LOST`, `HEDGED`, `VOID`
- Each position has `hedges: HedgeBet[]` for linked hedge bets
- Odds math: `americanToDecimal()`, `impliedProbability()`, `calcPayout()`, `calcProfit()`
- Portfolio analytics: `getPortfolioSummary()`, `getExposureByTeam()`
- Supabase table: `futures_odds_snapshots` (migration `002_futures_odds.sql`)
- **Planned phases**: ~~B = HedgeCalculator~~, ~~C = FuturesOddsMonitor + agent~~, D = ParlayTracker, E = PlayoffBracket

### Hedge Calculator (src/lib/hedgeCalculator.js + src/components/futures/HedgeCalculator.jsx)
- **Pure math lib** (`hedgeCalculator.js`):
  - `lockHedgeStake(futurePayout, hedgeOdds)` — X = P/D; guarantees equal net in both outcomes
  - `breakEvenHedgeStake(futureStake, hedgeOdds)` — X = S/(D-1); zero loss if futures fails
  - `analyzeScenario(futureStake, futurePayout, hedgeStake, hedgeOdds)` — full scenario: futuresWin, futuresLose, totalInvested, min/maxNet, ROI
  - `noHedgeBaseline(futureStake, futurePayout)` — comparison baseline
  - `computeAllModes(...)` — returns `{ noHedge, lock, breakEven }` all at once
  - `portfolioMatrix(positions)` — for multiple positions on same event; returns net P&L per possible winner
- **UI** (`HedgeCalculator.jsx`): 3rd sub-tab inside FuturesPortfolio
  - Position picker (open positions only) with summary card
  - Hedge odds input + sportsbook dropdown
  - Strategy modes: Lock Profit | Break Even | Custom Stake
  - Scenario table: Futures Wins / Futures Loses rows with Net P&L, ROI, vs No Hedge delta
  - Worst-case comparison footer (no-hedge vs hedged, $ saved)
  - "Save Hedge to Position" → calls `addHedge()`, syncs back to Positions tab
  - Portfolio Scenarios collapsible matrix (auto-shown when ≥2 positions have same type)

### Futures Odds Monitor (agents/futures-odds-ingest.js + src/components/futures/FuturesOddsMonitor.jsx)
- **Agent** (`futures-odds-ingest.js`): polls 3 TheOddsAPI outrights sport keys daily
  - `americanfootball_nfl_super_bowl_winner`, `_championship_winner`, `_division_winner`
  - Writes rows to `futures_odds_snapshots` (snapshot_time, market_type, team, book, odds, implied_prob)
  - Cost: 3 markets × 2 req each = 6 API calls/run; 1×/day = ~186 req/month offseason
  - Prunes rows older than 30 days; dry_run mode supported
  - GitHub Actions: `.github/workflows/futures-odds-ingest.yml` — 10:00 UTC daily
- **Supabase** (`supabase.js`): `getLatestFuturesOdds()` — fetches most recent snapshot per market; `getFuturesOddsHistory(team, marketType, days)` — for future trend charts
- **UI** (`FuturesOddsMonitor.jsx`): 4th sub-tab inside FuturesPortfolio
  - For each open position that maps to a tracked market: entry odds vs current best available
  - Value direction badge (Value ↑ / Value ↓ / Flat) from bettor's perspective
  - Expanded panel: all books + implied probability comparison + prob delta explanation
  - Unsupported bet types (Playoffs, Wins O/U) listed separately with explanation
  - Auto-fetches Supabase on mount; manual Refresh button; graceful "no data" state with agent run instructions

---

## Learnings & Gotchas

### Props & State
- Always verify prop names match between parent and child
- When adding new Header props, update both Header.jsx AND App.jsx simultaneously
- Default prop values prevent undefined errors: `schedule = []`, `edges = []`

### Data Formats
- Confidence values: Store as whole numbers (57), not decimals (0.57)
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

- **NCAA content in NFL project**: Cleaned up. All NCAA files have been removed.

- **Hook TDZ ordering**: Never call a hook that receives a `const fn = () =>` callback BEFORE that `const` declaration in the same component body. `const` is NOT hoisted. Move the hook call BELOW the function definition. Symptom: `ReferenceError: Cannot access 'X' before initialization`.

- **Public file fetches**: NEVER use hardcoded `/filename.json`. Vite base is `/platinum-rose-app/` so `public/` files must be fetched as `./filename.json` or `` `${import.meta.env.BASE_URL}filename.json` ``. Hardcoded `/` prefix 404s in production.

- **React.memo comparator must match actual prop names**: If comparator checks `g1.overUnder` but the game object uses `g1.total`, field changes are invisible to the memo. Always verify field names match the actual data object.

- **Bankroll bet ID type mismatch**: Bet IDs are created as `Date.now()` (number) but filtering may use string comparison. Always normalize: `const sids = new Set([...ids].map(String))` and filter with `!sids.has(String(b.id))`.

- **ReviewPicksModal Context field**: `handleAIAnalyze` creates picks with `rationale: p.summary || p.rationale || p.analysis` — GPT never returns `analysis` directly, so `pick.analysis` is always undefined. The "Context" field must read `pick.rationale`.

- **Auto-save guard anti-pattern**: `if (state.length > 0) { saveToStorage(key, state) }` seems safe but prevents cleared state from persisting. After `clearBets()`, state becomes `[]`, the guard skips the save, and data resurrects after refresh. Solution: remove all guards and call `clearStorage(key, emptyDefault)` explicitly in clear handlers. Initial-render skips are unnecessary — hooks already load from localStorage.

- **Boot clobber — never unconditionally set state from a network fetch**: `setSplits(splitsData || {})` in the boot effect overwrites the user's Action Network splits on every hard refresh (and wipes them entirely on network failure). Always check localStorage first: only use the remote value if the local key is empty. Rule: boot effects initialize; they don't overwrite.

- **Raw localStorage calls outside storage.js**: `picksDatabase.js`, `bankroll.js`, and `EditBetModal.jsx` all had direct `localStorage.getItem/setItem` calls that bypassed try/catch and the key catalog. All reads/writes must go through `loadFromStorage`/`saveToStorage`. This also means `PR_STORAGE_KEYS` is the single source of truth — key string changes only need to happen in one place.

---

## Testing Checklist
> **Verification gate** — run after changes to App.jsx, storage logic, or parsers. A task is not done until relevant items pass.
- [ ] App boots without console errors
- [ ] Dashboard loads schedule and displays matchup cards
- [ ] Sync Odds loads data without burning extra API calls
- [ ] Picks Tracker loads picks from localStorage
- [ ] All 9 tabs render without crashing
- [ ] Bulk import (Action Network) parses and updates splits
- [ ] AI transcript analysis extracts and stages picks
- [ ] Bankroll bet entry saves to localStorage
- [ ] Futures position entry saves and survives hard refresh
- [ ] Clear a betting card → hard refresh → bets stay cleared (no resurrection)
- [ ] StorageBackupModal opens, shows 13 keys, export produces valid JSON

### Line History Chart — Feature Test Plan
> Verify after changes to `LineHistoryChart.jsx`, `supabase.js` (`getLineHistoryDB`/`getActiveGameKeys`), or `OddsCenter.jsx`.
- [ ] **Tab renders** — "Line History" tab visible in OddsCenter, click doesn't crash
- [ ] **Demo fallback** — with no Supabase data, chart renders demo Eagles @ Chiefs game; amber "DEMO" badge present
- [ ] **Market tabs** — switching Spread / Total O/U / Moneyline re-renders chart with correct data
- [ ] **Opening/Current/Net Move** — three stat cards update when switching markets (demo: spread open = -2.5, net = -0.5)
- [ ] **Chart renders** — recharts step chart visible; at least 2 book lines plotted
- [ ] **Tooltip** — hover chart shows timestamp + per-book values in custom tooltip
- [ ] **Opening reference line** — dashed gray line at opening value is present
- [ ] **Book badges** — bottom book chips show correct current line values
- [ ] **Game dropdown** — with Supabase data: dropdown populates from `getActiveGameKeys()`; selecting different game reloads chart
- [ ] **Refresh button** — clicking Refresh re-fetches without page reload
- [ ] **No console errors** in any market tab or game selection

---

## Agent System — Future Architecture

### Planned Agents (adapted from NCAA project)
| Agent | Purpose | Priority | Status |
|-------|---------|----------|--------|
| **OddsIngestAgent** | Poll TheOddsAPI on schedule, cache odds + line snapshots | HIGH | ✅ Built (`agents/odds-ingest.js`, `.github/workflows/odds-ingest.yml`) |
| **NFLAutoGradeAgent** | Poll ESPN NFL scoreboard, grade pending picks automatically | HIGH | ✅ Built (`agents/nfl-auto-grade.js`, `.github/workflows/nfl-auto-grade.yml`) |
| **PodcastIngestAgent** | Extract NFL picks from podcast RSS feeds via PickExtractionAgent | MEDIUM | Planned |
| **PickExtractionAgent** | Shared AI extraction backbone — sport-agnostic | MEDIUM | Planned |
| **TwitterIngestAgent** | Extract NFL picks from bookmarked tweets | LOW | Planned |
| **AgentScheduler** | Cron orchestrator for all agents | MEDIUM | Handled by GitHub Actions |

### Planned Hooks
| Hook | Purpose |
|------|---------|
| `useAutoGrade` | Auto-grade picks when games finish (ESPN NFL scoreboard via Supabase `game_results`) — **BUILT** |
| `useAutoLoad` | "Full Morning Load" — fetch edges + run sims + build picks in one click |
| `useExpertInbox` | Bridge Node.js agents → browser state for expert picks |
| `useMatchupIntel` | Surface podcast analysis on MatchupCards |

### Agent Design Principles (from NCAA)
- Set `maxRetries` / `maxRunTimeMs` on every agent
- Validate agent output schemas before writing to `public/` or localStorage
- Agents report structured errors — never swallow in try/catch
- All agents degrade gracefully: no config = local-only behavior unchanged

### File System Memory — Coordination Layer
Two-folder pattern separates **data** from **operational state**:

| Folder | Purpose | Consumers |
|--------|---------|----------|
| `public/` | Data outputs (odds, schedule, stats JSON) | React app (browser) |
| `memory/` | Operational logs, agent state, dev handoffs | Agents, AgentScheduler, dev sessions |
| `handoffs/` | Dev session context briefings | Fresh chat sessions |

**Agent memory files** (`memory/{agent}-{date}.md`):
- What ran, when, success/failure
- Last-processed IDs (prevents duplicate work)
- Remaining API budget / rate limit state
- Resume instructions if interrupted

**Dev handoff files** (`handoffs/YYYY-MM-DD-HHMM.md`):
- Written by `/handoff` command or proactively when sessions get long
- Self-contained resume block — paste into fresh chat to continue

**Rule**: Agents never communicate directly. All coordination flows through files.

---

## Unfinished Features (Priority Order)

### Priority 1 — Core ✅ COMPLETE
1. ~~**Arbitrage Finder**~~ — **Done.** `ArbitrageFinder.jsx` — real odds, stake calculator, demo fallback
2. ~~**Steam Move Tracker**~~ — **Done.** `SteamMoveTracker.jsx` — real `lineMovements` localStorage + demo fallback
3. ~~**Bet Value Comparison**~~ — **Done.** `BetValueComparison.jsx` — compares `nfl_my_bets` vs cached market lines, "beat the close" delta logic
4. ~~**Line Movement Alerts**~~ — **Done.** `LineMovementTracker.jsx` — refactored to `getLineMovements()` + bet-aware alert generation

### Priority 2 — Enhancement
5. ~~**Historical line charts**~~ — **Done.** `LineHistoryChart.jsx` — recharts stepAfter per-book lines, demo fallback, spread/total/ML tabs, opening/current/delta summary
6. ~~**Expert picks integration & accuracy tracking**~~ — **Done.** `ExpertLeaderboard.jsx` + `expertStats.js` — live W-L-P/win%/units per expert, pick detail rows, auto-graded via `useAutoGrade`
7. ~~**Bet outcome tracking dashboard**~~ — **Done.** `OutcomesDashboard.jsx` + `lib/outcomesMerger.js` — merges `nfl_bankroll_data_v1` + `pr_picks_v1`, cumulative P&L recharts chart (dual Y-axes: dollars + units), filterable outcome table, source comparison cards. Accessible via Analytics tab → "Outcomes" sub-tab.
8. ~~**Advanced filtering & sorting**~~ — **Done.** `Dashboard.jsx` — search box (team name/abbr), sort dropdown (game time/spread/total), filter chips (All, Has Expert Picks, Big Spread, High Total, Low Total, Dome Game), game count badge, "no results" empty state with clear button.
9. ~~**Performance analytics (ROI by sportsbook, timing analysis)**~~ — **Done.** `BookAnalytics.jsx` — recharts horizontal bar chart + sortable table (ROI/profit/win%/volume by sportsbook, W-L-P, mini win-distribution bar). `calculateBookAnalytics()` added to `analyticsEngine.js`. `BettingPatterns.jsx` upgraded with hour-of-day buckets + win-rate fill bars with break-even tick. Accessible via Analytics tab → Overview.

### Priority 3 — Infrastructure
10. Cloud sync (Firebase/Supabase)
11. CI/CD pipeline (GitHub Actions)
12. Testing suite (Jest + Cypress)

### Futures Portfolio Phases
- ~~**Phase A — Core CRUD**~~ — **Done.** `futures.js`, `FuturesPortfolio.jsx`, `FuturesEntryModal.jsx`, `002_futures_odds.sql`
- ~~**Phase B — Hedge Calculator**~~ — **Done.** `hedgeCalculator.js` (lock/break-even/custom math + portfolio matrix), `HedgeCalculator.jsx` (sub-tab in Futures Portfolio)
- ~~**Phase C — Odds Monitor + Ingest Agent**~~ — **Done.** `FuturesOddsMonitor.jsx` + `agents/futures-odds-ingest.js`; Supabase table already created; GitHub Actions workflow added
- **Phase D — Parlay Tracker** — `ParlayTracker.jsx`; open parlay tracking with per-leg result + hedge integration
- **Phase E — Playoff Bracket** — `PlayoffBracket.jsx`; visual bracket overlay showing total exposure per team

---

## Style Constants
- Primary accent: `#00d2be` (teal)
- Background: `#0f0f0f`
- AI Lab: emerald (`text-emerald-400`, `bg-emerald-500/20`)
- Positive: emerald, Negative: rose, Neutral: amber/slate
- Selection highlight: `selection:bg-[#00d2be] selection:text-black`

## Custom Commands

### /handoff
When the user types `/handoff`, OR when you notice the session is getting long (6+ tasks completed, multi-hour session), proactively suggest running `/handoff`.

Produce two outputs:

#### Output 1: Save to `handoffs/YYYY-MM-DD-HHMM.md`
Write a persistent handoff file with this structure:
```
# Handoff — YYYY-MM-DD HH:MM
Session: ~Xh | Model: [model name]

## CRITICAL (mid-flight / broken / blocking)
- [item]

## DONE
- [file] — one-line description

## PENDING
- [task] — current state, what remains

## BLOCKERS (waiting on external)
- [item]

## OPEN DECISIONS (need user input)
- [item]

## GOTCHAS DISCOVERED
- [anti-pattern or trap found this session]

## RESUME COMMAND
[One copy-pasteable sentence to continue in a fresh chat]
```

#### Output 2: Chat message to user
Display the same content in chat, formatted as:

1. **Session summary** — Bullet-point recap organized by CRITICAL / DONE / PENDING
2. **Context briefing** — Self-contained block to paste into a fresh chat:
   - Project name, stack, dev URL, workspace path
   - All files modified this session with one-line descriptions
   - Current state of any in-progress work
   - Immediate next steps in priority order
   - Anti-patterns encountered
   - **Resume Command**: One copy-pasteable sentence

Then tell the user: "Handoff saved to `handoffs/YYYY-MM-DD-HHMM.md`. To continue: paste the Resume Command into a fresh chat."

#### What to SKIP in handoffs
- Completed tasks already documented in CLAUDE.md
- Debugging output and intermediate steps
- Concept explanations (can re-derive)
- Casual conversation
- Failed attempts that led nowhere (unless blocking)
