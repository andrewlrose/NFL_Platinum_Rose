# Gotchas — NFL Platinum Rose

> **Known quirks, rate limits, and non-obvious behaviors.**
> **Consult before touching APIs, pipeline agents, or Supabase tables.**

---

## TheOddsAPI

- **500 requests/month** on the free plan. Track usage carefully.
- Auto-refresh is DISABLED — was burning 30 calls/hour at 2-minute intervals.
- Startup fetch is DISABLED — every browser refresh counted as 1 API call.
- 10-minute caching layer in LiveOddsDashboard.jsx. Only fetches on explicit user action (Sync button or Odds tab visit).
- API returns games in UTC. See `docs/ANTI_PATTERNS.md` — Date & Time section for conversion rules.

## Groq (Whisper Transcription)

- **7200 seconds/hour** rate limit on audio transcription.
- If Groq rejects a request, the pipeline falls back to AssemblyAI automatically.
- Groq is **priority 1** (free); AssemblyAI is **priority 2** (paid, no rate limit, URL-based).

## AssemblyAI

- `speech_models` parameter is **required** and must be an **array**: `['universal-2']` or `['universal-3-pro']`.
- The singular `speech_model` (string) parameter is **deprecated** and returns a 400 error.
- AssemblyAI accepts URL-based audio (no upload needed) — useful for podcast URLs.

## Supabase Tables

| Table | Source | Notes |
|-------|--------|-------|
| `odds_snapshots` | OddsIngestAgent (GHA) | Populated by TheOddsAPI via pipeline |
| `line_movements` | OddsIngestAgent (GHA) | Derived from snapshot diffs |
| `game_results` | AutoGradeAgent (GHA) | ESPN scoreboard results |
| `user_picks` | PickExtractionAgent (GHA) + browser | `source='EXPERT'` = pipeline; `source='USER'` = browser |
| `futures_odds` | FuturesOddsIngestAgent (GHA) | Division/conference/Super Bowl futures |
| `podcast_transcripts` | PodcastIngestAgent (GHA) | Groq → AssemblyAI fallback chain |

### Supabase Column Quirks

- `podcast_transcripts.picks_promoted_at = NULL` means the transcript hasn't been promoted to picks yet — safe to retry extraction.
- `user_picks.source` must be either `'EXPERT'` or `'USER'` — no other values.
- `user_picks` expert rows include `rationale`, `expert`, and `units` columns (added in migration 005).

## ESPN Injuries API

- Endpoint: `site.api.espn.com/.../teams/{ID}/injuries`
- No API key required (public endpoint).
- Team IDs are ESPN-specific integers, not standard NFL team abbreviations.
- Injury designations: Out, Doubtful, Questionable. "Probable" was removed from NFL in 2016 but still appears informally.

## GitHub Actions Pipeline

- GHA runs **check out the commit at trigger time**. If you push a fix and immediately re-trigger a workflow, the run may use the pre-fix commit. Wait for push to complete, or verify the commit SHA in the "Checkout" step.
- Pipeline agents are JS files in `agents/`: `odds-ingest.js`, `nfl-auto-grade.js`, `pick-extraction.js`, `podcast-ingest.js`, `futures-odds-ingest.js`.
- All pipeline agents use `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS) — this key is **GHA-only**, never exposed to browser.

## Vite / Build

- Base path is `/platinum-rose-app/` for GitHub Pages deployment.
- Public files must be fetched as `./filename.json` or `` `${import.meta.env.BASE_URL}filename.json` ``. Hardcoded `/` prefix 404s.
- `@` alias maps to `./src` in `vite.config.js`.
