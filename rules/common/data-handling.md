# Data Handling Rules

## localStorage — The Primary Store

localStorage is the **primary** data store. Supabase is a fire-and-forget sync layer.

### Key Catalog

All keys live in `PR_STORAGE_KEYS` inside `src/lib/storage.js`. This is the single source of truth.

| Key | Permanence | Managed By |
|-----|-----------|------------ |
| `nfl_splits` | persistent | useSchedule.js |
| `nfl_my_bets` | persistent | useBettingCard.js |
| `nfl_sim_results` | persistent | useSchedule.js |
| `nfl_contest_lines` | persistent | useSchedule.js |
| `nfl_expert_consensus` | **critical** | useExperts.js |
| `pr_picks_v1` | **critical** | picksDatabase.js |
| `pr_game_results_v1` | persistent | picksDatabase.js |
| `nfl_bankroll_data_v1` | **critical** | bankroll.js |
| `nfl_futures_portfolio_v1` | **critical** | futures.js |
| `pr_playoff_bracket_v1` | persistent | PlayoffBracket.jsx |
| `cached_odds_data` | ephemeral | LiveOddsDashboard.jsx |
| `cached_odds_time` | ephemeral | LiveOddsDashboard.jsx |
| `lineMovements` | ephemeral | enhancedOddsApi.js |
| `PR_OPENAI_KEY` | persistent | AudioUploadModal.jsx |

### Must-Never Rules

1. **Never call `localStorage` directly** — use `loadFromStorage()` / `saveToStorage()` / `clearStorage()` from `storage.js`
2. **Never rename a key** without a migration helper that reads old key → writes new key → deletes old key
3. **Never guard saves with length checks** — `if (arr.length > 0) save(key, arr)` prevents cleared state from persisting. Just save.
4. **Critical keys** (`pr_picks_v1`, `nfl_bankroll_data_v1`, `nfl_futures_portfolio_v1`, `nfl_expert_consensus`) — `removeFromStorage()` is blocked; only explicit user action via StorageBackupModal can clear

### Sync Architecture

```
Write flow:  Component → saveToStorage(key, data) → localStorage
                                                   → Supabase upsert (fire-and-forget)

Read flow:   App boot → loadFromStorage(key) → localStorage (instant, offline-capable)
             App boot → hydrateFromSupabase() → fills any keys missing from localStorage
```

## Date & Time Rules

1. **UTC commence_time offset**: API timestamps are UTC ISO strings. A 7pm ET game stores as `"2026-09-10T23:00:00Z"`. Using `.split('T')[0]` can produce a date one day ahead. Always convert to local timezone before extracting a date string.

2. **Date-only string display trap**: `new Date("2026-09-10").toLocaleDateString()` renders as 9/9 in ET because JS parses `YYYY-MM-DD` as midnight UTC. Always append `T12:00:00`:
   ```js
   new Date("2026-09-10T12:00:00").toLocaleDateString() // → "9/10/2026" ✅
   ```

3. **Never use `timeZone: 'UTC'`** in `toLocaleDateString` options — the app is ET-oriented.

## Team Name Normalization

NFL team names come from multiple sources (TheOddsAPI, ESPN, schedule.json, user input). Normalize early:

```js
// ✅ Canonical form: full team name from teams.js
import { TEAMS } from '@/lib/teams';

// ✅ Always compare normalized
const normalize = (name) => name?.trim().toLowerCase();
```

**Rules:**
- TheOddsAPI uses full names: `"Kansas City Chiefs"`
- ESPN uses abbreviations: `"KC"`
- User input can be anything: `"chiefs"`, `"kc"`, `"Kansas City"`
- Always normalize to a canonical form before comparing or storing

## Public File Access (Vite)

**Never** use hardcoded `/filename.json`. Vite base is `/platinum-rose-app/`.

```js
// ✅ Correct
fetch('./schedule.json')
fetch(`${import.meta.env.BASE_URL}schedule.json`)

// ❌ Will 404 in production
fetch('/schedule.json')
```

## API Data Rules

### TheOddsAPI
- Free plan: 500 requests/month
- Auto-refresh is DISABLED
- Startup fetch is DISABLED
- 10-minute caching layer in LiveOddsDashboard.jsx
- Only fetch on explicit user action (Sync button or Odds tab visit)

### ESPN Injuries
- Endpoint: `site.api.espn.com/.../teams/{ID}/injuries`
- Used for NFL team injury reports
- No rate limit documented but use reasonable caching

### Supabase
- Dynamic import pattern for optional dependency:
  ```js
  const { supabase } = await import('@/lib/supabase');
  ```
- Tables: odds_snapshots, line_movements, game_results, futures_odds_snapshots, podcast_feeds/episodes/transcripts, user_picks, user_bankroll_bets

## Boot-Clobber Prevention

**Never unconditionally set state from a network fetch at boot.**

```js
// ❌ Clobbers localStorage on every refresh
useEffect(() => {
  const data = await fetchRemote();
  setSplits(data || {});
}, []);

// ✅ Only use remote if local is empty
useEffect(() => {
  const local = loadFromStorage('nfl_splits');
  if (local && Object.keys(local).length > 0) {
    setSplits(local);
    return;
  }
  const remote = await fetchRemote();
  if (remote) setSplits(remote);
}, []);
```

## Confidence Values

Store as **whole numbers** (57), not decimals (0.57). Display with `%` suffix.
