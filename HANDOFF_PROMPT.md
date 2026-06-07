# HANDOFF_PROMPT.md — NFL Platinum Rose

> Rolling session handoff. Read this first in a fresh session, then read WORKING-CONTEXT.md.

## Persistent Backlogs

> Read at every session start. Mark items done in the source file, not here.

| Backlog | File | Open Items | Last Touched |
|---------|------|-----------|--------------|
| Feature & Architecture | `docs/NFL_BACKLOG.md` | 1 open | 2026-06-06 |

## Last Session Summary

- Date: 2026-06-06
- Branch: main
- HEAD: e0b94a8 — "S165: sharp books ingest + splits history + vault-seed Spreadspoke/DVOA"
- Tests: 607/607 passing

## What Was Done (S161–S165)

**S165** — bookmaker + betonline added to `game-odds-ingest.js` SPORTSBOOKS constant.

**S164** — vault-seed Spreadspoke (ATS) + DVOA schemas added to `agents/vault-seed.js`;
`game_splits_history` append table (migration 024) applied; `betting-splits-ingest.js` now
dual-writes to both `game_splits` and `game_splits_history`. New npm scripts:
`seed:vault:dvoa`, `seed:vault:ats`. DVOA + 2025 ATS records seeded to Supabase `vault_notes`.

**S162/S163** — vault-seed extended with `player_stats_weekly`, `player_stats_seasonal`,
`team_stats` nflverse schemas; CSV parser bug fixes; nflverse auto-downloader.

**S161** — nflverse pipeline end-to-end. 100 vault notes ingested:
`NFL/Reference/{FTN,GameResults,Schedules,ESPN}-2022.md` + `NFL/Teams/[32]-{QBR,Schedule}.md`.

## Critical Status

- DS-4 (`research-intel-ingest.js`) is **built and migration 009 is applied** — live ingest has NOT been validated yet. This is the immediate next step.
- `x-sharp-ingest.js` (F-13) is built and migration 013 is applied — but real X/Twitter handles are all disabled (no public RSS). Only RSS-backed accounts are active (SharpFootball, PFF, PFT, Rotowire, FootballOutsiders, ESPN). Disposition decision pending.
- Overlap exists: SharpFootball, PFF, PFT, ESPN NFL appear in both `x-sharp-ingest` and `research-intel-ingest` feed lists → data in both `x_sharp_tweets` and `research_intel_notes`.

## What To Do Next

1. `npm run ingest-research-intel -- --dry-run` — check which of the 7 feeds return usable content
2. If feeds look clean, run live: `npm run ingest-research-intel`
3. Verify rows in `research_intel_notes` and `research_pick_signals` in Supabase
4. Decide x-sharp-ingest disposition (merge / repurpose / scope-separate)
5. F-9 Sunday Slate Briefing — proactive BETTING agent entry point (Pillar 3)

## Resume Command

```text
Resume Platinum Rose NFL. HEAD = e0b94a8 (main). Suite: 607/607. Vault seeding
complete (DVOA + ATS + nflverse). DS-4 research intel built but not live-validated.
x-sharp-ingest disposition pending. Next: DS-4 dry-run then live, then x-sharp decision.
Read HANDOFF_PROMPT.md for full context before touching any file.
```

## Notes

- Read order for fresh session: CLAUDE.md → HANDOFF_PROMPT.md → WORKING-CONTEXT.md
- `data/vault-seed/{pff,splits,manual}/` are empty — drop CSVs there to seed via `npm run seed:vault`
- Python scripts (`scripts/*.py`) are intentionally SEASON=2025 — defer to Aug 2026
- Podcast pipeline is live on M6 at Tailscale `atlas.tail1e459d.ts.net`
- Treat `.nfl/receipts/` and `supabase/.temp/` as local artifacts (not git-tracked)
