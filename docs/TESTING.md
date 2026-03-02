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
- [ ] Picks Tracker → "Podcast Intel" button opens modal without crash
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

---

## Podcast Ingest Pipeline — Feature Test Plan
Verify after changes to `agents/podcast-ingest.js`, `PodcastIngestModal.jsx`, `supabase.js` (`getPodcastEpisodes`), or `003_podcast.sql`:

### GitHub Actions Agent
- [ ] **Dry run passes** — workflow runs with `dry_run=true`, exits 0, logs "X recent episodes" for each of 4 feeds, no Supabase writes
- [ ] **Live run (max_per_run=1)** — workflow runs with `dry_run=false`, exits 0; agent logs "1 transcribed + extracted"
- [ ] **Episode in Supabase** — after live run, `podcast_episodes` table has 1 row with `status = 'done'`
- [ ] **Transcript in Supabase** — `podcast_transcripts` table has 1 row with non-empty `picks` or `intel` arrays
- [ ] **Dedup works** — re-running the agent immediately processes 0 new episodes (all guids already known)
- [ ] **Error recovery** — if one episode fails, agent marks it `status = 'error'` with `error_msg`, continues to next, exits 1

### PodcastIngestModal UI
- [ ] **Button visible** — "Podcast Intel" teal button appears in Picks Tracker header
- [ ] **Modal opens** — clicking button opens `PodcastIngestModal` without crash
- [ ] **Episodes load** — processed episodes appear grouped by feed name (Sharp or Square / Even Money / Action Network / Warren Sharp)
- [ ] **Expand episode** — clicking episode row chevron expands picks + intel sections
- [ ] **Pick cards render** — each pick shows type chip (SPREAD/MONEYLINE/TOTAL), selection, line, summary, game date
- [ ] **Intel notes render** — bullet list of analysis notes below picks
- [ ] **Import button** — clicking "Import N" calls `addExpertPick()` for each pick; button changes to "✓ Imported"
- [ ] **Import confirmation** — green banner "✓ N picks added to Picks Tracker" appears after import
- [ ] **Picks appear in tracker** — after import, closing modal and checking All Picks tab shows new EXPERT source picks
- [ ] **Refresh button** — refresh icon re-fetches from Supabase without closing modal
- [ ] **Empty state** — with no processed episodes, modal shows "No Episodes Yet" message with cron schedule note
- [ ] **Partial audio badge** — episodes with `is_partial=true` show "PARTIAL AUDIO" amber chip

### Supabase / Data Layer
- [ ] **`getPodcastEpisodes()` returns joined data** — result includes nested `podcast_feeds.name`, `podcast_feeds.expert`, `podcast_transcripts.picks`, `podcast_transcripts.intel`
- [ ] **Only `status='done'` episodes returned** — pending/error/transcribing episodes not shown in UI
- [ ] **Groq path** — if `GROQ_API_KEY` secret is set, agent logs "Using Groq (free) Whisper (whisper-large-v3)"
- [ ] **OpenAI fallback** — if only `OPENAI_API_KEY` set, agent logs "Using OpenAI Whisper (whisper-1)"
- [ ] **AssemblyAI fallback** — if `GROQ_API_KEY` + `ASSEMBLYAI_API_KEY` both set and Groq hits rate limit, agent logs "⚠ Groq rate-limited — falling back to AssemblyAI" and episode completes (not marked error)
- [ ] **AssemblyAI-only path** — if only `ASSEMBLYAI_API_KEY` set (no Groq), agent skips file download, passes URL directly, polls for completion
- [ ] **model_used stored** — `podcast_transcripts.model_used` reflects actual provider: `groq-whisper-large-v3+gpt-4o`, `assemblyai+gpt-4o`, or `whisper-1+gpt-4o`
- [ ] **OpenAI key valid** — GPT-4o extraction succeeds; 401 means `OPENAI_API_KEY` GHA secret needs rotating at platform.openai.com/account/api-keys

---

## Pick Extraction Agent — Feature Test Plan
Verify after changes to `agents/pick-extraction.js`, `pick-extraction.yml`, `005_pick_extraction.sql`, or `src/lib/supabase.js` (`loadUserPicks`):

### GitHub Actions Agent
- [ ] **Dry run passes** — workflow runs with `dry_run=true`, exits 0, logs picks without writing to `user_picks`; `picks_promoted_at` remains NULL in Supabase
- [ ] **Live run** — workflow runs with `dry_run=false`, exits 0; logs "Upserted N picks" for at least 1 transcript
- [ ] **Picks in Supabase** — after live run, `user_picks` table has rows with `source='EXPERT'`, non-empty `expert`, non-empty `rationale`
- [ ] **Promoted flag set** — `podcast_transcripts.picks_promoted_at` is non-NULL for processed transcripts
- [ ] **Idempotent** — re-running agent immediately processes 0 transcripts (all have `picks_promoted_at` set); `user_picks` row count unchanged
- [ ] **Team matching** — picks with recognisable teams (e.g. "Chiefs") resolve to a schedule game ID, not a synthetic `podcast_UNK_vs_UNK` ID
- [ ] **Error exits 1** — if upsert fails (e.g. malformed row), agent exits 1
- [ ] **Groq rate limit handled gracefully** — when Groq returns `rate_limit_exceeded`, episode is reset to `status='pending'` (not `'error'`), agent stops early without marking errors, exits 0
- [ ] **OpenAI key valid** — GPT-4o extraction succeeds; 401 invalid_api_key means `OPENAI_API_KEY` GHA secret needs updating at platform.openai.com/account/api-keys

### Supabase / Data Layer
- [ ] **Migration 005 applied** — `podcast_transcripts` has `picks_promoted_at` column; `user_picks` has `rationale`, `expert`, `units`
- [ ] **`loadUserPicks()` maps new fields** — after boot hydration, picks in localStorage have `rationale`, `expert`, `units` populated (check via App.jsx: `window.__picks = loadPicks()`)

### Boot Hydration (App.jsx)
- [ ] **Expert picks hydrate on boot** — clear localStorage, hard-refresh app; expert picks written by the agent appear in Picks Tracker after `hydrateFromSupabase()` completes
- [ ] **No duplicates** — picks already in localStorage are NOT duplicated by hydration (dedup by ID)
- [ ] **Source label** — hydrated expert picks show source chip "EXPERT" in Picks Tracker UI
