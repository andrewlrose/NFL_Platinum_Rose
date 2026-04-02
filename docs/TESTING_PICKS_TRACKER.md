# Picks Tracker — Feature Test Plan
_Added: 2026-02-28 | Covers: Moneyline support, Auto-grade, Expert→Tracker, Filter bar_

---

## 1. Moneyline Support

### 1a. `addPick()` accepts moneyline
1. Open DevLab or browser console.
2. Run:
   ```js
   import('/src/lib/picksDatabase.js').then(m => {
     const r = m.addPick({
       source: 'AI_LAB', gameId: 'test-ml-001', pickType: 'moneyline',
       selection: 'Kansas City Chiefs', line: -165,
       home: 'Kansas City Chiefs', visitor: 'Buffalo Bills',
       gameDate: '2026-02-07', isHomeTeam: true, confidence: 60, edge: 0,
     });
     console.log('saved:', r);
   });
   ```
3. ✅ Pick saved with `pickType: 'moneyline'` — no validation error.
4. ❌ Console should NOT log `Invalid pickType: moneyline`.

### 1b. `gradeMoneyline()` — home team wins
1. Add the pick from 1a.
2. Run `m.gradeGame('test-ml-001', 27, 24)` (home wins).
3. ✅ Result = `WIN`.

### 1c. `gradeMoneyline()` — away team picked
1. Add a pick with `isHomeTeam: false`, `selection: 'Buffalo Bills'`.
2. `gradeGame(gameId, 27, 24)` (home wins, visitor loses).
3. ✅ Result = `LOSS`.

### 1d. `gradeMoneyline()` — tie (PUSH)
1. `gradeGame(gameId, 24, 24)`.
2. ✅ Result = `PUSH`.

### 1e. Moneyline displays correctly in UI
1. Navigate to **Picks Tracker → All Picks**.
2. Find a moneyline pick.
3. ✅ Shows `"Team +150 ML"` or `"Team -165 ML"` (not just `"Team -165"`).
4. Repeat check in **Grade** tab game row and **ManualGradeModal** pick list.

---

## 2. Auto-Grade from Supabase

### 2a. Auto-Grade button renders
1. Navigate to **Picks Tracker → Grade** tab.
2. Add at least one pick with a past `gameDate` to create a pending game group.
3. ✅ "Auto-Grade" button appears in header row next to pick count.
4. ✅ Button is NOT visible on the Overview or All Picks tabs.

### 2b. Button fires `runGradingCheck`
1. Open Network tab (F12).
2. Click **Auto-Grade**.
3. ✅ Button text changes to "Checking…" with spinning icon.
4. ✅ A request to Supabase `game_results` table fires (or gracefully logs "No final results found" if table is empty).
5. ✅ Button returns to "Auto-Grade" when check completes.

### 2c. Concurrent-run guard
1. Click **Auto-Grade** twice rapidly.
2. ✅ Only one Supabase request fires (the `runningRef` guard).

### 2d. Auto-grade on tab load (mount)
1. Have at least one stale PENDING pick.
2. Refresh the page, navigate straight to **Picks → Grade**.
3. ✅ `useAutoGrade` fires on mount — check console for `[useAutoGrade]` log.
4. If a matching `game_results` row exists in Supabase, pick is graded automatically before the user does anything.

### 2e. Poll interval
1. With PENDING picks present, leave the Picks tab open for 5+ minutes.
2. ✅ `[useAutoGrade]` logs appear every ~5 minutes.
3. After all picks are graded, ✅ polling stops (no more logs).

---

## 3. Expert Picks → Picks Tracker

### 3a. Track button visible in Expert Manager
1. Open **Expert Manager** modal (via Header or Dashboard).
2. Select any expert who has picks.
3. ✅ Each pick row shows a teal `BookmarkPlus` icon button.
4. ✅ Tooltip on hover reads "Send to Picks Tracker".
5. ✅ Edit (pencil) and Delete (trash) buttons still present.

### 3b. Sending a pick to the tracker
1. Click the `BookmarkPlus` button on any spread pick.
2. ✅ Alert shows `"✅ [ExpertName]'s pick sent to Picks Tracker!"`.
3. Navigate to **Picks Tracker → All Picks**.
4. ✅ Pick appears with source badge **EX** (purple).
5. ✅ `pickType`, `selection`, `line`, `home`, `visitor`, `gameDate` match the original expert pick.

### 3c. Duplicate guard
1. Click the same `BookmarkPlus` button a second time (within 60 seconds).
2. ✅ Alert says "Already tracked or required fields missing." (no duplicate pick added).
3. ✅ Pick count in All Picks tab does not increase.

### 3d. Expert pick grading
1. Track an expert spread pick for a game with a known score.
2. Navigate to **Picks → Grade** tab.
3. ✅ Game group shows the EX-badged pick alongside any AI picks for the same game.
4. Click the game and enter the final score in ManualGradeModal.
5. ✅ Expert pick grades correctly (WIN/LOSS/PUSH).

### 3e. EXPERT source in Standings
1. Track several expert picks and grade some of them.
2. Navigate to **Picks → Overview**.
3. ✅ "Expert Picks" standings card appears alongside "AI Dev Lab".
4. ✅ Record, Win%, ROI, Units all compute correctly.

### 3f. VALID_SOURCES enforcement
1. Attempt to add a pick via console with `source: 'INVALID'`.
2. ✅ `validatePick` returns `{ valid: false, errors: ['Invalid source: INVALID'] }`.
3. ✅ No pick is saved.

---

## 4. Filter Bar Expansion

### 4a. All five filters render
1. Navigate to **Picks Tracker → All Picks**.
2. ✅ Five controls visible: Source dropdown, Result dropdown, Pick Type dropdown, Date From input, Date To input.
3. ✅ Pick count badge updates when any filter changes.

### 4b. Source filter — EXPERT
1. Set Source = "Expert Picks".
2. ✅ Only `source: 'EXPERT'` picks shown.
3. ✅ AI Lab picks hidden.

### 4c. Pick Type filter — spread / total / moneyline
1. Add one pick of each type (AI Lab).
2. Set Pick Type = "Spread" → ✅ only spread picks show.
3. Set Pick Type = "Total" → ✅ only total picks show.
4. Set Pick Type = "Moneyline" → ✅ only moneyline picks show.
5. Set Pick Type = "All Types" → ✅ all three visible.

### 4d. Date From / Date To filters
1. Add picks across multiple `gameDate` values (e.g. 2026-01-15 and 2026-02-07).
2. Set Date From = `2026-02-01` → ✅ only picks on or after Feb 1 shown.
3. Set Date To = `2026-01-31` → ✅ only picks on or before Jan 31 shown.
4. Set both → ✅ inclusive date range applied correctly.
5. Clear both → ✅ all picks return.

### 4e. Combined filters
1. Set Source = "AI Dev Lab", Result = "WIN", Pick Type = "Spread".
2. ✅ Only AI Lab spread wins shown.
3. ✅ Count badge matches the filtered list length.

### 4f. No results state
1. Apply a filter combination that matches nothing (e.g. date range in the future).
2. ✅ Empty state renders: list icon + "No picks match your filters."
3. ✅ No JS error thrown.

---

## Regression Checks

| Area | Check |
|------|-------|
| DevLab → add AI pick | Spread and total still save + display correctly |
| ManualGradeModal | Spread and total still grade correctly (existing logic untouched) |
| ExpertLeaderboard | Still loads; standings unaffected by the new EXPERT source in `pr_picks_v1` |
| Health Check button | Runs without error; reports EXPERT picks in stale check if applicable |
| Reset All button | Clears both `pr_picks_v1` and `pr_game_results_v1`; page refreshes to zero |
| `pr_picks_v1` storage key | Unchanged — no migration needed |
