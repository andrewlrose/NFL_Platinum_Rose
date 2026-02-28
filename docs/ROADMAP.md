# Feature Roadmap — NFL Platinum Rose
> Load this for planning tasks: "what should I work on next?", scoping new features, or reviewing what's done.

---

## Priority 1 — Core ✅ COMPLETE
1. ~~**Arbitrage Finder**~~ — `ArbitrageFinder.jsx` — real odds, stake calculator, demo fallback
2. ~~**Steam Move Tracker**~~ — `SteamMoveTracker.jsx` — real `lineMovements` localStorage + demo fallback
3. ~~**Bet Value Comparison**~~ — `BetValueComparison.jsx` — compares `nfl_my_bets` vs cached market lines, "beat the close" delta logic
4. ~~**Line Movement Alerts**~~ — `LineMovementTracker.jsx` — refactored to `getLineMovements()` + bet-aware alert generation

## Priority 2 — Enhancement ✅ COMPLETE
5. ~~**Historical line charts**~~ — `LineHistoryChart.jsx` — recharts stepAfter per-book lines, demo fallback, spread/total/ML tabs, opening/current/delta summary
6. ~~**Expert picks integration & accuracy tracking**~~ — `ExpertLeaderboard.jsx` + `expertStats.js` — live W-L-P/win%/units per expert, pick detail rows, auto-graded via `useAutoGrade`
7. ~~**Bet outcome tracking dashboard**~~ — `OutcomesDashboard.jsx` + `lib/outcomesMerger.js` — merges `nfl_bankroll_data_v1` + `pr_picks_v1`, cumulative P&L recharts chart (dual Y-axes: dollars + units), filterable outcome table, source comparison cards. Accessible via Analytics tab → "Outcomes" sub-tab.
8. ~~**Advanced filtering & sorting**~~ — `Dashboard.jsx` — search box (team name/abbr), sort dropdown (game time/spread/total), filter chips (All, Has Expert Picks, Big Spread, High Total, Low Total, Dome Game), game count badge, "no results" empty state with clear button.
9. ~~**Performance analytics (ROI by sportsbook, timing analysis)**~~ — `BookAnalytics.jsx` — recharts horizontal bar chart + sortable table (ROI/profit/win%/volume by sportsbook, W-L-P, mini win-distribution bar). `calculateBookAnalytics()` added to `analyticsEngine.js`. `BettingPatterns.jsx` upgraded with hour-of-day buckets + win-rate fill bars with break-even tick. Accessible via Analytics tab → Overview.

## Priority 3 — Infrastructure
10. Cloud sync (Firebase/Supabase) — Supabase partially done (odds, results, futures); full user data sync not started
11. CI/CD pipeline (GitHub Actions) — agents deployed; app deploy not automated
12. Testing suite (Jest + Cypress) — not started

---

## Futures Portfolio Phases ✅ ALL COMPLETE

| Phase | Component | Status | Summary |
|-------|-----------|--------|---------|
| A | `FuturesPortfolio.jsx`, `futures.js`, `FuturesEntryModal.jsx` | ✅ Done | Core CRUD, position table, exposure view |
| B | `HedgeCalculator.jsx`, `hedgeCalculator.js` | ✅ Done | Lock/break-even/custom math + portfolio matrix |
| C | `FuturesOddsMonitor.jsx`, `agents/futures-odds-ingest.js` | ✅ Done | Entry vs current best odds; GitHub Actions daily ingest |
| D | `ParlayTracker.jsx` | ✅ Done | Multi-leg parlay tracking, per-leg result cycling, hedge prefill |
| E | `PlayoffBracket.jsx` | ✅ Done | 14-team visual bracket, exposure overlay per seed, editable seeds |

---

## Agent Roadmap (see docs/AGENTS.md for detail)

| Agent | Status |
|-------|--------|
| OddsIngestAgent | ✅ Built |
| NFLAutoGradeAgent | ✅ Built |
| FuturesOddsIngestAgent | ✅ Built |
| PodcastIngestAgent | Planned |
| PickExtractionAgent | Planned |
| TwitterIngestAgent | Planned |
