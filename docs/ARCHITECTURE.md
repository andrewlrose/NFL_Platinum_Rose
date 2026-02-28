# Architecture Reference — NFL Platinum Rose
> Load this when editing any file in `src/` — components, hooks, or lib files.

---

## App.jsx — Central Hub (~110 lines)
- Pure wiring layer — imports hooks, destructures, renders JSX
- Only local state: `activeTab`, `selectedGame`
- `gamesWithSplits` cross-cutting `useMemo` (merges data from useSchedule + useExperts)
- 16 modals lazy-mounted with `{modals.x && <Modal />}` — zero DOM overhead when closed
  - Includes: splits, teasers, pulse, contest, audio, review, import, expertMgr, injuryReport, unitCalculator, betEntry, betImport, pendingBets, editBet, gradeModal, bankrollSettings
- All business logic delegated to custom hooks (see below)

---

## Custom Hooks (src/hooks/)

### useModals — Modal state reducer
- Single `useReducer` replaces 15 individual `useState` booleans
- `openModal(name)` / `closeModal(name)` — stable refs via `useCallback`
- Associated data: `selectedBetForEdit`, `gradeGameData`, `picksRefreshKey`

### useSchedule — Boot sequence + data
- Owns: `schedule`, `stats`, `splits`, `injuries`, `loading`, `contestLines`, `simResults`
- Boot `useEffect`: `Promise.all([schedule, empty-odds, stats, splits])` → merge → fetch injuries
- `findGameForTeam(rawInput)` — 3-tier matching: alias dict → abbreviation → substring (`useCallback([schedule])`)
- `handleBulkImport` — Action Network splits parser (`useCallback([splits, schedule, findGameForTeam])`)
- Auto-save effects for `splits`, `simResults`, `contestLines`

### useExperts — Expert consensus CRUD + AI
- Owns: `expertConsensus`, `stagedPicks`
- Params: `{ schedule, findGameForTeam, openModal, closeModal }`
- `handleAIAnalyze` — GPT-4o transcript → staged picks → toggles audio/review modals
- `handleConfirmPicks` — commits staged picks to consensus (functional updater)
- `handleUpdatePick` / `handleDeletePick` / `handleClearExpert` — stable refs (`useCallback([])`)
- Auto-save effect for `expertConsensus`

### useBettingCard — Personal betting card
- Owns: `myBets`
- Params: `schedule` (for team name lookup)
- `handleBet`, `removeBet`, `handleLockBets`, `clearBets` — all stable refs
- Auto-save effect for `myBets`

---

## Storage Manager (src/lib/storage.js)
- `PR_STORAGE_KEYS` — catalog of all keys with `permanence: 'critical' | 'persistent' | 'ephemeral'`
- `CRITICAL_KEYS` — Set of keys blocked from `removeFromStorage()`: expert consensus, picks, bankroll, futures
- `loadFromStorage(key, defaultValue)` / `saveToStorage(key, value)` — try/catch wrappers; used by all hooks and lib files
- `clearStorage(key, emptyValue)` — explicitly writes empty default so clears survive hard refresh
- `removeFromStorage(key)` — blocked for critical keys with console.warn; ephemeral/persistent only
- `exportAppData()` / `downloadBackup()` — dumps all known keys to JSON file (browser download)
- `importAppData(snapshot)` — restores from JSON, only writes known keys (safe against injection)
- `getStorageDiagnostics()` — returns + `console.table()`s all keys with size (KB), count, present status

## StorageBackupModal (src/components/modals/StorageBackupModal.jsx)
- Opened via `Database` icon button in Header toolbar
- Shows diagnostics table: all keys, size, count, permanence badge, present indicator
- Export → triggers `downloadBackup()` file download
- Import → file picker → `importAppData()` → full restore
- Per-key Clear buttons: blocked (ShieldCheck icon shown) for critical keys, confirmation dialog for others

---

## Supabase Client (src/lib/supabase.js)
- Browser-side Supabase client (anon/public key, read-only)
- `getLatestOddsSnapshot()` — read most recent agent-written odds; called by LiveOddsDashboard
- `getLineMovementsDB(hours)` — read line movement rows; called by SteamMoveTracker, LineMovementTracker
- `getGameResults({ week, season })` — read game results for optional week/season filter
- `getGameResultsByIds(espnIds)` — look up specific final games by ESPN ID array; called by useAutoGrade
- Falls back gracefully if Supabase is unavailable (no URL/key configured)

## API Config (src/lib/apiConfig.js)
- Single source of truth for all API endpoints, keys, and constants
- Exports: `ODDS_API_KEY`, `OPENAI_API_KEY`, `ODDS_API`, `OPENAI_API`, `ESPN_API`, `GITHUB_RAW`, `LOCAL_DATA`
- All env vars read here, not scattered across files

## Constants (src/lib/constants.js)
- `getNFLWeekInfo()` — derives current NFL week/phase from date (regular season weeks 1-18, playoff rounds, offseason)
- `CURRENT_WEEK` — numeric week derived from `getNFLWeekInfo().week`
- Used by Header.jsx for dynamic week label display

## OpenAI Integration (src/lib/openai.js)
- `extractPicksFromTranscript(text, sourceData, availableGames)` — GPT-4o transcript → picks extraction
- Extracted from App.jsx inline `handleAIAnalyze` fetch call
- Returns parsed picks array, throws on API error

---

## Team Database (src/lib/teams.js)
- 32 NFL teams with logos, abbreviations, aliases
- `TEAM_ALIASES` — maps common names/abbreviations to standard names
- `TEAM_LOGOS` — comprehensive logo lookup (abbreviation + name + city → URL) — single source of truth
- `NAME_MAP` — used by actionParser.js for splits matching
- `normalizeTeam(input)` — returns canonical team name
- `getTeamLogo(team)` — returns ESPN CDN logo URL
- `getTeamAbbreviation(team)` — returns standard abbreviation (used by oddsApi.js)
- `getDomeTeams()` — returns set of indoor teams

---

## Picks System (src/lib/picksDatabase.js)
- `STORAGE_KEY = 'pr_picks_v1'` / `RESULTS_KEY = 'pr_game_results_v1'`
- Sources: `'AI_LAB'`
- Types: `'spread'`, `'total'`
- Results: `'WIN'`, `'LOSS'`, `'PUSH'`, `'PENDING'`
- Confidence stored as whole numbers (57), not decimals (0.57)
- `addPick()` → `loadPicks()` → `gradeGame(gameId, homeScore, visitorScore)` → `calculateStandings()`
- `statsByConfidence()` / `statsByEdge()` — bucket analysis
- `findStalePicksPending()` — picks older than threshold with no grade

## Bankroll System (src/lib/bankroll.js)
- `STORAGE_KEY = 'nfl_bankroll_data_v1'`
- Full CRUD for bets with status tracking (OPEN, PLACED, WIN, LOSS, PUSH)
- Unit sizing calculator
- P&L analytics

---

## Futures System (src/lib/futures.js)
- `STORAGE_KEY = 'nfl_futures_portfolio_v1'`
- Data shape: `{ positions: FuturesPosition[], parlays: OpenParlay[] }`
- Types: `playoffs`, `wins`, `division`, `conference`, `superbowl`, `sb_matchup`
- Status: `OPEN`, `WON`, `LOST`, `HEDGED`, `VOID`
- Each position has `hedges: HedgeBet[]` for linked hedge bets
- Odds math: `americanToDecimal()`, `impliedProbability()`, `calcPayout()`, `calcProfit()`
- Portfolio analytics: `getPortfolioSummary()`, `getExposureByTeam()`
- Supabase table: `futures_odds_snapshots` (migration `002_futures_odds.sql`)
- All phases complete: A (CRUD), B (Hedge), C (Odds Monitor), D (Parlay Tracker), E (Playoff Bracket)

## Hedge Calculator (src/lib/hedgeCalculator.js + src/components/futures/HedgeCalculator.jsx)
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

## Futures Odds Monitor (agents/futures-odds-ingest.js + src/components/futures/FuturesOddsMonitor.jsx)
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

## Futures Portfolio Sub-tabs (src/components/futures/FuturesPortfolio.jsx)
| Sub-tab | Component | Description |
|---------|-----------|-------------|
| Positions | _(inline)_ | CRUD table for open/settled futures |
| Exposure | _(inline)_ | Group positions by team, stake/payout totals |
| Hedge Calc | `HedgeCalculator.jsx` | Lock/break-even/custom hedge math |
| Odds Monitor | `FuturesOddsMonitor.jsx` | Entry vs current best odds per position |
| Parlays | `ParlayTracker.jsx` | Multi-leg parlay tracking, per-leg result cycling, hedge prefill |
| Playoff Bracket | `PlayoffBracket.jsx` | 14-team bracket with exposure overlay per seed |
