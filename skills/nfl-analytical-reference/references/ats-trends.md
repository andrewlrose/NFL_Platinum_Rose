# NFL ATS Trends Reference

> **Vault path:** `NFL/Reference/ATS_Trends.md`
> **Update cadence:** Weekly during season. Seed version — populate after Week 1.
> Flag this note with `#needs-update` until current-season data is loaded.

---

## Using This Reference

ATS (Against The Spread) trends provide context for team-level betting tendencies
but should be treated as **supporting evidence, not primary signals**.

**Tier classification for ATS data:**
- Tier 1 (strong signal): 3+ season trend with >60% ATS rate, sample ≥20 games
- Tier 2 (supporting): Single-season trend or situational subset (after bye, at home)
- Tier 3 (noise): <10 game sample, narrative-driven, recency bias

---

## Current Season ATS Records

> **2026 Season — Not yet populated.**
> Update this section weekly with: Team | ATS Record | Trend | Notes

```
Format when updating:
KC:  0-0 ATS (No data yet)
BUF: 0-0 ATS (No data yet)
...
```

---

## Situational ATS Patterns (Update Weekly)

### After a Bye Week
Teams historically go **57-43 ATS** after a bye week (slight edge for the rested team).
Best filter: home team off bye + opponent on short week.

### Division Games
**Fade favorites in division games.** Historical ATS: favorites cover at ~48%
in divisional matchups (below 50%). Familiarity reduces talent-gap impact.

### Back-to-Back Road Games
Teams on the second leg of back-to-back road trips cover at ~46% ATS.
Flag these situations when evaluating a road team.

### Primetime Underdog
Home underdogs in primetime (Sunday Night, Monday Night, Thursday Night) cover
at ~53% ATS historically. The hype lifts the spread too high for the favorite.

### Revenge Game
Team facing a team that beat them by 14+ last meeting: covers at ~55% ATS.

---

## Active Trend Tracker (Update Each Week)

> Delete entries when the trend ends or the season ends.

| Team | Trend | Start | Record | Context |
| --- | --- | --- | --- | --- |
| *(empty)* | *(No trends tracked yet)* | — | — | — |

---

## Hot/Cold ATS Teams (Update Weekly)

> L5 = last 5 games ATS

| Team | L5 ATS | L10 ATS | Season ATS | Note |
| --- | --- | --- | --- | --- |
| *(empty)* | — | — | — | — |

---

*Seed template — populate starting Week 1 of the 2026 season.*
*Agent: use `write_vault_note` to update this file after each week's games.*
