# Date Handling — Platinum Rose Skill

> **Trigger:** Load this skill for any file that touches `commence_time`, `gameDate`, `Date()`, date formatting, or timezone conversion.

---

## The Core Problem

ESPN / TheOddsAPI store game times as **UTC ISO strings**. A 7 PM ET game on Feb 18 is stored as `"2026-02-19T00:00:00Z"` — midnight UTC, **the next calendar day**. Any date logic that ignores this will produce a +1 day offset.

---

## Canonical Functions

| Task | Use This | NEVER Use |
|---|---|---|
| UTC ISO → ET calendar date string | `etDateStr(ts)` | `localDateStr(ts)`, `.toISOString().split('T')[0]`, `.split('T')[0]` |
| Display a plain `YYYY-MM-DD` date string | `fmtPickDate(dateStr)` or append `T12:00:00` before `new Date()` | `new Date("2026-02-25").toLocaleDateString()` (renders as day-1 in ET) |
| Date formatter with time parts | `timeZone: 'America/New_York'` | `timeZone: 'UTC'` (shows +1 day for evening ET games) |

### `etDateStr(ts)` — source of truth

```js
function etDateStr(ts) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date(ts))
    .replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2'); // → "YYYY-MM-DD"
}
```

- Defined in `src/lib/picksDatabase.js`
- Use for: `aiLabToPick`, `gunitToPick`, `handleConfirmPicks`, any hook that maps `commence_time` → `gameDate`

### `fmtPickDate(dateStr)` — display only

```js
// Input: "2026-02-25" (plain date string, no time part)
// Use this; do NOT use new Date("2026-02-25").toLocaleDateString()
```

---

## `verifyAndCorrectPickDates` — One-directional Rule

This function in `picksDatabase.js` corrects picks stored with a raw UTC calendar date. Rules:

- **Only** corrects picks where `pick.gameDate === utcDate` (the raw UTC calendar date).
- **Never** touches picks that don't match that exact string.
- Correction is strictly unidirectional: UTC-date → ET-date. No reverse.
- Uses `etDateStr()` (not `localDateStr`) — must be timezone-safe on any machine.

---

## `gameDate` vs `commence_time`

| Field | Lives on | Type | What it is |
|---|---|---|---|
| `gameDate` | **Pick objects** (picksDatabase.js) | `"YYYY-MM-DD"` string | ET calendar date, stored by `aiLabToPick` / `gunitToPick` |
| `commence_time` | **Schedule game objects** | UTC ISO string | Raw API timestamp; never use `.split('T')[0]` on this |

Never use `g.gameDate` on a schedule object — it returns `undefined`. Use `etDateStr(new Date(g.commence_time))`.

---

## Anti-Patterns (vivid examples from this codebase)

- **`.split('T')[0]` on commence_time** → 7 PM ET games resolve to the next calendar day. ❌
- **`new Date("2026-02-25").toLocaleDateString()`** → Renders as 2/24 in ET because JS parses bare YYYY-MM-DD as midnight UTC. ❌
- **`toLocaleDateString(..., { timeZone: 'UTC' })`** → Shows +1 day for any evening ET game. ❌
- **`verifyAndCorrectPickDates` using `localDateStr()`** → Machine-timezone-dependent; overcorrects correctly-stored ET picks on non-ET machines. ❌
- **`g.gameDate` on a schedule object** → Always `undefined`. Schedule games use `commence_time`. ❌

---

## Checklist Before Touching Date Logic

- [ ] Am I reading `commence_time`? → Use `etDateStr()`, never `.split('T')[0]`
- [ ] Am I displaying a stored `gameDate` string? → Use `fmtPickDate()` or `new Date(str + 'T12:00:00')`
- [ ] Am I formatting with `Intl.DateTimeFormat`? → `timeZone: 'America/New_York'`, not `'UTC'`
- [ ] Am I writing a date to a pick's `gameDate`? → Must go through `etDateStr(ts)` first
- [ ] Is this function running on a non-ET server? → Use `Intl` APIs — never `getFullYear/Month/Date` (local TZ)
