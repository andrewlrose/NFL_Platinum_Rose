# WORKING-CONTEXT.md — NFL Platinum Rose
> **Live operational state. Update this file at every session close.**
> **Read this at session start before touching any file.**
> Last updated: 2026-06-06 | Branch: `main` | HEAD: `e0b94a8`

---

## Current Mode

```
MODE: Offseason Architecture Build
Active: June 6, 2026
Context: Vault seeding pipeline live end-to-end. DVOA + 2025 ATS (Spreadspoke) seeded
         to Supabase vault_notes. game_splits_history append table live (migration 024).
         bookmaker + betonline added to game-odds-ingest. 607/607 tests passing.
         x-sharp-ingest built (F-13) but real X/Twitter accounts not yet live —
         active accounts are all RSS-backed. research-intel-ingest (DS-4) built and
         migration 009 applied; live ingest validation pending.
Reference: TASK_BOARD.md (stale — see ## Next Session Priority below)
```

---

## Active Sprint — S165 State

| ID | Task | Status | Notes |
|----|------|--------|-------|
| **DS-2** | Season schedule spine | ✅ Done | `games` table + schedule-ingest.js |
| **DS-3** | Futures breadth expansion | ✅ Done | migration 008; market availability receipts |
| **DS-4** | Research intel ingest v1 | 🔄 Built, pending live validation | migration 009 applied; dry-run needed |
| **F-13** | X/Twitter sharp-account ingest | ⚠️ Partial | x-sharp-ingest.js built; only RSS-backed accounts active; real X handles disabled |
| **F-14** | Vault pre-load (reference data) | ✅ Done | DVOA + ATS (Spreadspoke) seeded; nflverse pipeline end-to-end (100 vault notes) |
| **Vault-seed** | vault-seed.js agent | ✅ Done | auto-detects CSV schemas; Spreadspoke/DVOA/nflverse all live |
| **game_splits_history** | Append table for splits | ✅ Done | migration 024; betting-splits-ingest dual-writes |
| **Sharp books ingest** | bookmaker + betonline in odds ingest | ✅ Done | added to SPORTSBOOKS constant in game-odds-ingest.js |

---

## Migration State (All Applied)

| # | File | Purpose |
|---|------|---------|
| 001–009 | init through research_intel | Core schema including `research_intel_notes` + `research_pick_signals` |
| 010–013 | odds snapshots, FTS, vault_notes, x_sharp_tweets | Odds + vault + X ingest tables |
| 014–018 | historical_stats, pbp_tendencies, player_injuries, RLS | Analytics + injury pipeline |
| 019–024 | RLS, audit, pick IDs, odds upsert keys, podcast v2, splits history | Latest — migration 024 is most recent |

---

## Vault-Seed Drop Dirs

| Dir | Status | Notes |
|-----|--------|-------|
| `data/vault-seed/ats/` | ✅ Seeded | `nfl_2025.csv` (Spreadspoke 2025 ATS records) |
| `data/vault-seed/dvoa/` | ✅ Seeded | `dvoa-2025.json` |
| `data/vault-seed/nflverse/` | ✅ Present | `ftn_charting.csv`, `games.csv`, `player_stats_*.csv`, `espn_data.csv` |
| `data/vault-seed/pff/` | ⏳ Empty | Drop PFF grade exports here when available |
| `data/vault-seed/splits/` | ⏳ Empty | Drop Action Network splits history here when available |
| `data/vault-seed/manual/` | ⏳ Empty | Drop any manual reference CSVs here |

---

## Data Source Health

| Source | Status | Last Refreshed | Notes |
|--------|--------|---------------|-------|
| TheOddsAPI | ⏸️ Offseason | — | 500 req/month free plan; manual fetch only; bookmaker + betonline now included |
| ESPN Scoreboard | ✅ Available | — | NFL offseason — no active games |
| ESPN Injuries | ✅ Available | — | `seasons/2026` primary, `seasons/2025` fallback |
| Supabase | ✅ Connected | — | 24 migrations applied; all core tables live |
| Schedule.json | ✅ Local | — | `public/schedule.json` |
| Weekly Stats | ✅ Local | — | Still 2025 data — Python scripts intentionally still SEASON=2025 (defer to Aug 2026) |
| Podcast Pipeline | ✅ Built | — | Groq → AssemblyAI → OpenAI Whisper fallback chain; Tailscale serve live on M6 |
| RSS/Intel feeds | ✅ Built | — | research-intel-ingest.js — 7 feeds; live validation pending |
| X/Sharp accounts | ⚠️ Partial | — | x-sharp-ingest.js — 6 RSS-backed accounts active; real X handles disabled (no RSS) |
| nflverse data | ✅ Seeded | S161 | 100 vault notes (FTN, GameResults, Schedules, ESPN, per-team QBR/Schedule) |
| DVOA | ✅ Seeded | S164 | dvoa-2025.json → Supabase vault_notes |
| ATS (Spreadspoke) | ✅ Seeded | S164 | nfl_2025.csv → Supabase vault_notes |
| game_splits_history | ✅ Live | S164 | migration 024 applied; dual-write from betting-splits-ingest |

---

## Offseason Architecture Vision (Locked 2026-05-08)

Four pillars — see full spec in WORKING-CONTEXT.md revision from 2026-05-08:

1. **NFL Betting Vault** — vault notes read/write from BETTING agent; F-12 delivered (`vaultClient.js`)
2. **Expanded Data Ingestion** — research-intel pipeline + vault-seed agent + x-sharp-ingest
3. **BETTING Agent Game-Day Proactive Mode** — F-9 Sunday Slate Briefing (not yet built)
4. **Performance Feedback Loop** — analytics aggregation layer + BETTING context injection (not yet built)

---

## npm Scripts (Key)

```bash
npm run seed:vault            # Run vault-seed agent (all dirs)
npm run seed:vault:dvoa       # Seed dvoa/ dir only
npm run seed:vault:ats        # Seed ats/ dir only
npm run ingest-research-intel # DS-4 live ingest
npm run ingest-research-intel:dry  # DS-4 dry-run
npm run ingest-schedule       # 2026 season schedule
npm run ingest-futures        # Futures odds
npm run daily-brief           # NFL daily brief agent
npm run test                  # vitest (607 tests)
```

---

## Blockers

None.

---

## Open Questions

1. **x-sharp-ingest real X access**: RSSHub Twitter scraper is broken on rsshub.app. Self-host RSSHub, or accept that x-sharp-ingest is an RSS agent only. Sharp X-only accounts (VSiN, Action Network analysts) remain unreachable without this.
2. **x-sharp vs research-intel overlap**: SharpFootball, PFF, PFT, ESPN NFL appear in both agents' feed lists → data duplication across `x_sharp_tweets` and `research_intel_notes`. Recommend consolidation or clear table ownership separation.
3. **Article ingestion (Action Network, BettingPros, VSiN)**: research-intel-ingest has these feeds; validate whether they're returning usable RSS content in live run.
4. **PFF grades export**: `data/vault-seed/pff/` empty — when does Creator have grade files to drop?
5. **F-9 Sunday Slate Briefing**: Not started. Proactive BETTING agent entry point (Pillar 3).

## Deferred

- **Python scripts season bump** (`scripts/*.py`): SEASON=2025 intentional — revisit late-August 2026.
- **Props auto-grade pipeline**: No GHA agent yet for `nfl_props_picks_v1`.
- **TheOddsAPI props tier**: PROPS agent built; prop lines require paid tier — revisit pre-season.
- **F-9 Sunday Slate Briefing**: Pillar 3 feature, not yet started.
- **Performance feedback loop** (Pillar 4): Analytics aggregation + BETTING context injection, not yet started.

---

## Next Session Priority

1. **DS-4 live validation** — run `npm run ingest-research-intel:dry` then live; confirm rows in `research_intel_notes` + `research_pick_signals`
2. **x-sharp-ingest disposition** — merge into research-intel-ingest, repurpose for real X, or document scope separation
3. **F-9 Sunday Slate Briefing** — proactive BETTING agent entry point (Pillar 3)

---

## Head Commit

```text
Branch: main
Commit: e0b94a8 — S165: sharp books ingest + splits history + vault-seed Spreadspoke/DVOA
Remote: origin/main synced
Tests: 607/607 passing
```
