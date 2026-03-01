# Agent System — NFL Platinum Rose
> Load this when working in `agents/`, `.github/workflows/`, Supabase migrations, or building any new ingest pipeline.

---

## GitHub Actions Secrets
| Secret | Value |
|--------|-------|
| `SUPABASE_URL` | https://aambmuzfcojxqvbzhngp.supabase.co |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role JWT (bypasses RLS) |
| `ODDS_API_KEY` | TheOddsAPI key (same as VITE_ODDS_API_KEY) |
| `OPENAI_API_KEY` | OpenAI key — used by PodcastIngestAgent (Whisper + GPT-4o) |

Add at: GitHub repo → Settings → Secrets and variables → Actions

---

## Built Agents

| Agent | File | Schedule | Purpose |
|-------|------|----------|---------|
| **OddsIngestAgent** | `agents/odds-ingest.js` | GitHub Actions: `odds-ingest.yml` | Poll TheOddsAPI, write odds + line snapshots to Supabase |
| **NFLAutoGradeAgent** | `agents/nfl-auto-grade.js` | GitHub Actions: `nfl-auto-grade.yml` | Poll ESPN NFL scoreboard, grade pending picks automatically |
| **FuturesOddsIngestAgent** | `agents/futures-odds-ingest.js` | GitHub Actions: `futures-odds-ingest.yml` 10:00 UTC daily | Poll 3 outrights markets, write to `futures_odds_snapshots` |
| **PodcastIngestAgent** | `agents/podcast-ingest.js` | GitHub Actions: `podcast-ingest.yml` every 6 hours | Poll RSS feeds, Whisper transcribe, GPT-4o pick extraction → Supabase |

### FuturesOddsIngestAgent — detail
- Polls: `americanfootball_nfl_super_bowl_winner`, `_championship_winner`, `_division_winner`
- Writes rows: `(snapshot_time, market_type, team, book, odds, implied_prob)`
- Cost: 3 markets × 2 req = 6 API calls/run → ~186 req/month offseason
- Prunes rows older than 30 days; supports `dry_run` mode

---

## Planned Agents

| Agent | Purpose | Priority |
|-------|---------|----------|
| **PickExtractionAgent** | Shared AI extraction backbone — sport-agnostic | MEDIUM |
| **TwitterIngestAgent** | Extract NFL picks from bookmarked tweets | LOW |

## Planned Hooks (browser-side bridge to agents)
| Hook | Purpose |
|------|---------|
| `useAutoLoad` | "Full Morning Load" — fetch edges + run sims + build picks in one click |
| `useExpertInbox` | Bridge Node.js agents → browser state for expert picks |
| `useMatchupIntel` | Surface podcast analysis on MatchupCards |

---

## Agent Design Principles
- Set `maxRetries` / `maxRunTimeMs` on every agent
- Validate agent output schemas before writing to `public/` or Supabase
- Agents report structured errors — never swallow in try/catch
- All agents degrade gracefully: no config = local-only behavior unchanged

---

## File System Memory — Coordination Layer
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

**Rule**: Agents never communicate directly. All coordination flows through files.

---

## Supabase Tables
| Table | Migration | Writer | Reader |
|-------|-----------|--------|--------|
| `odds_snapshots` | `001_init.sql` | OddsIngestAgent | LiveOddsDashboard |
| `line_movements` | `001_init.sql` | OddsIngestAgent | SteamMoveTracker, LineMovementTracker |
| `game_results` | `001_init.sql` | NFLAutoGradeAgent | useAutoGrade |
| `futures_odds_snapshots` | `002_futures_odds.sql` | FuturesOddsIngestAgent | FuturesOddsMonitor |
| `podcast_feeds` | `003_podcast.sql` | migration seed | PodcastIngestAgent, PodcastIngestModal |
| `podcast_episodes` | `003_podcast.sql` | PodcastIngestAgent | PodcastIngestModal |
| `podcast_transcripts` | `003_podcast.sql` | PodcastIngestAgent | PodcastIngestModal |
