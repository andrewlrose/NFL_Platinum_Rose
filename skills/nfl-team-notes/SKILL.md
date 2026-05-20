---
name: nfl-team-notes
description: >
  Per-team NFL betting reference notes for all 32 franchises. Each team note
  covers division, stadium profile (dome vs outdoor, climate), offensive and
  defensive identity, ATS tendencies, and key matchup factors. Use when
  evaluating a specific team's structural advantages or historical betting
  patterns. Seed stubs — update each week with current-season ATS data.
  Individual team files seed to NFL/Teams/<ABBR>.md in the vault.
compatibility: NFL betting analysis, team matchup evaluation
metadata:
  category: reference
  update_frequency: weekly
  source: research
  seed_path_pattern: "NFL/Teams/{ABBR}.md"
---

# NFL Team Notes — Usage Guide

Each team has a reference note at `NFL/Teams/{ABBR}.md` in the vault.
Use `read_vault_note` to load a team note when evaluating a specific matchup.

## What's in Each Team Note

- **Team identity** — Division, stadium, climate profile
- **Offensive / Defensive identity** — Structural tendencies (not personnel-specific)
- **ATS tendencies** — Flagged for weekly updates during the season
- **Key matchup factors** — Historical edges, coaching tendencies, scheduling quirks

## All 32 Team Abbreviations

| Division | Teams |
| --- | --- |
| AFC East | BUF, MIA, NE, NYJ |
| AFC North | BAL, CIN, CLE, PIT |
| AFC South | HOU, IND, JAX, TEN |
| AFC West | DEN, KC, LAC, LV |
| NFC East | DAL, NYG, PHI, WAS |
| NFC North | CHI, DET, GB, MIN |
| NFC South | ATL, CAR, NO, TB |
| NFC West | ARI, LAR, SEA, SF |

## Dome vs Outdoor Quick Reference

| Dome / Retractable | Outdoor (Cold-Weather Risk) | Outdoor (Warm/Neutral) |
| --- | --- | --- |
| ATL, DAL, DET, HOU, IND, JAX, LAC*, LAR, MIN, NO, LV, ARI (retractable) | BUF, CHI, CLE, DEN, GB, KC, MIN (outdoor), NE, NYG, NYJ, PIT, SEA | BAL, CIN, MIA, PHI, SF, TB, TEN, WAS |

*LAC plays at SoFi (shared with LAR), retractable roof.

**Impact:** Dome games add ~3-4 points to over/under. Cold-weather games
(wind >15 mph or temp <25°F) subtract 2-4 points. Always check weather
for outdoor cold-weather venues in November-January.

## Team Note Update Protocol

After each week's games, use `write_vault_note` to update:
1. Current ATS record for the week's teams
2. Trend changes (hot/cold streaks)
3. Key injury context
4. Cover/no-cover margin notes

See `NFL/Reference/ATS_Trends.md` for league-wide trend tracking.
