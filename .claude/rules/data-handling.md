---
inclusion: auto
description: Data handling, localStorage, and API rules for NFL Platinum Rose
---

# NFL Platinum Rose — Data Handling Rules

## localStorage Is the Primary Store

localStorage is the **primary** data store. Supabase is a fire-and-forget sync layer.

### Must-Never Rules

1. **Never call `localStorage` directly** — use `loadFromStorage()` / `saveToStorage()` / `clearStorage()` from `storage.js`
2. **Never rename a key** without a migration helper (read old → write new → delete old)
3. **Never guard saves with length checks** — `if (arr.length > 0) save(key, arr)` prevents cleared state from persisting
4. **Critical keys** (`pr_picks_v1`, `nfl_bankroll_data_v1`, `nfl_futures_portfolio_v1`, `nfl_expert_consensus`) — `removeFromStorage()` is blocked; only explicit user action via StorageBackupModal can clear

### Sync Architecture

```
Write: Component → saveToStorage(key, data) → localStorage → Supabase upsert (fire-and-forget)
Read:  App boot → loadFromStorage(key) → localStorage (instant, offline-capable)
       App boot → hydrateFromSupabase() → fills missing keys only
```

## Date & Time Rules

1. **UTC offset trap**: API timestamps are UTC ISO strings. A 7pm ET game stores as `"2026-09-10T23:00:00Z"`. Using `.split('T')[0]` can produce a date one day ahead. Always convert to local timezone first.
2. **Date-only string trap**: `new Date("2026-09-10").toLocaleDateString()` renders as 9/9 in ET. Always append `T12:00:00`.
3. **Never use `timeZone: 'UTC'`** in `toLocaleDateString` — the app is ET-oriented.

## Team Name Normalization

NFL team names come from multiple sources. Normalize early:
- TheOddsAPI: full names (`"Kansas City Chiefs"`)
- ESPN: abbreviations (`"KC"`)
- User input: anything (`"chiefs"`, `"kc"`)
- Always normalize to canonical form before comparing or storing

## Public File Access (Vite)

```js
// Correct — relative or base-aware
fetch('./schedule.json')
fetch(`${import.meta.env.BASE_URL}schedule.json`)

// WRONG — 404s in production (base is /platinum-rose-app/)
fetch('/schedule.json')
```

## API Rules

- **TheOddsAPI**: 500 requests/month (free plan). Auto-refresh DISABLED. Startup fetch DISABLED. 10-min cache. Fetch only on explicit user action.
- **Supabase**: Dynamic import pattern. Fire-and-forget sync. Never block UI on Supabase calls.

## Boot-Clobber Prevention

Never unconditionally set state from a network fetch at boot. Only use remote if local is empty.

## Confidence Values

Store as **whole numbers** (57), not decimals (0.57). Display with `%` suffix.
