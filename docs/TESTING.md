# Testing Checklists — NFL Platinum Rose
> Load this after changes to App.jsx, storage logic, parsers, or any feature with a dedicated test plan.
> **Verification gate** — a task is not done until relevant items pass.

---

## Core Verification Checklist
Run after changes to App.jsx, storage logic, or parsers:

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
- [ ] StorageBackupModal opens, shows all keys, export produces valid JSON

---

## Line History Chart — Feature Test Plan
Verify after changes to `LineHistoryChart.jsx`, `supabase.js` (`getLineHistoryDB`/`getActiveGameKeys`), or `OddsCenter.jsx`:

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

## Futures Portfolio — Feature Test Plan
Verify after changes to any file in `src/components/futures/` or `src/lib/futures.js`:

- [ ] All 6 sub-tabs render without crashing (Positions, Exposure, Hedge Calc, Odds Monitor, Parlays, Playoff Bracket)
- [ ] Add position → appears in Positions tab → survives hard refresh
- [ ] Delete position → removed from Exposure and Playoff Bracket overlays
- [ ] Hedge Calc: Lock Profit / Break Even / Custom Stake modes all produce non-zero outputs
- [ ] Parlay: add parlay with 2+ legs → click leg result to cycle PENDING→WIN→LOSS→PUSH → parlay status auto-advances
- [ ] Parlay → "Hedge this" → lands on Hedge Calc tab with prefilled values
- [ ] Playoff Bracket: Edit Seeds mode → pick a team → card updates → persists after refresh
- [ ] Playoff Bracket: teams with open futures show color-coded chips
- [ ] StorageBackupModal: `pr_playoff_bracket_v1` present in key table
