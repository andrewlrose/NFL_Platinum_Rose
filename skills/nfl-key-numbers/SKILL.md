---
name: nfl-key-numbers
description: >
  NFL betting key numbers — spread margins, hook values, teaser key number
  crossings, totals clusters, and half-point purchase rules. Core reference
  for every spread and teaser evaluation. Use when evaluating any line
  relative to common scoring margins, determining whether a hook matters,
  or checking Wong teaser qualification.
compatibility: NFL betting analysis, spread evaluation, teaser construction
metadata:
  vault_path: NFL/Reference/KeyNumbers.md
  category: reference
  update_frequency: static
  source: research
---

# NFL Key Numbers Reference

> **Vault path:** `NFL/Reference/KeyNumbers.md`
> **Update cadence:** Static — key number distribution is historically stable.
> Teaser pricing and line-buying thresholds should be reviewed if sportsbooks
> change standard juice (currently -110 default).

---

## Spread Key Numbers

Most common NFL final scoring margins, ranked by frequency:

| Key Number | Frequency | Why |
|---|---|---|
| **3** | ~15% of games | Field goal margin |
| **7** | ~9% of games | TD + PAT |
| **10** | ~6% of games | TD + FG |
| **6** | ~5% of games | TD, no PAT (2-pt attempt, penalty, missed) |
| **14** | ~5% of games | 2 TDs |
| **4** | ~4% of games | FG + safety / blown PAT |
| **17** | ~4% of games | 2 FGs + TD |
| **13** | ~3% of games | 4 FGs |
| **1** | ~3% of games | Safety margin |
| **11** | ~3% of games | TD + FG + safety |

**3 and 7 account for ~24% of all game outcomes.** Any spread crossing both is
strategically significant.

---

## Hook Value (Half-Point Analysis)

A "hook" is a half-point. Whether buying/selling a half-point has positive EV
depends entirely on whether it crosses a key number.

### High-value hooks

| Line | Direction | Why it matters |
|---|---|---|
| -3 / +3 | Crossing 3 (buy the hook off -3) | Converts push to win; most common margin |
| -7 / +7 | Crossing 7 (buy the hook off -7) | TD + PAT; second most common |
| -10 / +10 | Moderate value | TD + FG |
| -6 / +6 | Low-moderate | TD no PAT |
| -14 / +14 | Low-moderate | 2 TDs |

### Half-point purchase rule of thumb

Standard juice: -110 for both sides.
Buying a half-point off a key number typically costs -120 to -130.

- **Off 3:** Buying -3 down to -2.5 at -120 has positive EV (breakeven ~54.5%,
  roughly 15% of games land on 3 → pays off frequently enough)
- **Off 7:** Buying -7 down to -6.5 at -120 is marginal (~9% frequency at 7)
- **Never pay more than -130 to buy a half-point**, even off 3 — the edge
  disappears above that threshold.
- **Selling a hook onto 3 or 7** (e.g., -3.5 → -3 for +120) is also strong value.

---

## Wong Teasers

A **Wong teaser** (popularized by Stanford Wong) is a 6-point NFL teaser that
crosses BOTH 3 and 7 simultaneously for each leg. Historically positive EV at
standard -120 two-team pricing.

### Wong teaser qualification

A spread qualifies for a Wong teaser if it lies in the range **-7.5 to -1.5**
(crossing through both 3 and 7 when 6 points are applied):

| Original spread | After +6 | Crosses 3? | Crosses 7? |
|---|---|---|---|
| -7.5 | -1.5 | ✅ | ✅ Wong |
| -7 | -1 | ✅ | touches 7 only |
| -3.5 | +2.5 | ✅ | ✅ Wong |
| -3 | +3 | touches 3 only | |
| -2 | +4 | ✅ | ✅ Wong |
| +1.5 | +7.5 | ✅ | ✅ Wong |

**Key rule:** -8 to -2 spreads are the primary Wong teaser zone.
Favorites between -8 and -2 get the full double-key-number benefit.

### Wong teaser EV threshold
- Two-team 6-point teaser at -120: positive EV when both legs have >72.5%
  win probability at the new (post-teaser) spread
- At -110 pricing: both legs need >71.5% win probability
- Stale rule: do NOT use a teaser on a game where sharp money is moving
  the line toward the other side — teasers compound bad lines.

---

## Totals Key Numbers

Most common game totals (combined points scored):

| Range | Notes |
|---|---|
| **37–38** | Conservative game, strong defenses / bad weather |
| **41–44** | Most common cluster for neutral conditions |
| **45–47** | Average offensive environment, weak defenses |
| **51** | Common in high-pace shootout matchups |

**Important:** Totals key numbers are less impactful than spread key numbers.
Weather (wind >15 mph = -2 to -3 off total), dome games (+3 to +4), and pace
factors matter more for totals than small line differences.

### Totals half-point value
Below 41 and above 47, buying half-points on totals has marginal value.
The 41-45 range has the highest density — buying off 41 or 44 has moderate value.

---

## Moneyline Reference

Common American odds → implied win probability:

| ML Odds | Break-even win% |
|---|---|
| -110 | 52.4% |
| -115 | 53.5% |
| -120 | 54.5% |
| -130 | 56.5% |
| -150 | 60.0% |
| -200 | 66.7% |
| -300 | 75.0% |
| +120 | 45.5% |
| +130 | 43.5% |
| +150 | 40.0% |
| +200 | 33.3% |

**Vig on standard -110/-110 spread:** Each side pays 4.55% vig.
A 53.3% win rate on spreads breaks even at -110.

---

## Practical Decision Rules

1. **Never bet a 3-point favorite at worse than -120.** At -125 or worse, the
   hook insurance premium costs more than the expected value of winning on 3.

2. **Teaser checklist before building a leg:**
   - Is the spread in the -7.5 to -1.5 zone (Wong zone)?
   - Is the team likely to win by 2+ after the teaser adjustment?
   - Is there sharp money on the same side (confluence)?
   - If any answer is no, the leg is not a Wong-qualifying teaser.

3. **Home field adjustment:** ~2.5 points for standard home-field advantage.
   Reduces to ~1.5 in climate-controlled domes. Remove home-field credit
   entirely when a playoff-bound road team with superior talent is involved.

4. **Division game discount:** Cover % drops ~5% for both sides in divisional
   games — familiarity flattens the talent gap and encourages conservative
   game-planning. Fade heavy divisional favorites.

---

*Seed content — review pricing thresholds if standard juice changes from -110.*
