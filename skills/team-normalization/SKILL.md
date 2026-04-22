# Team Normalization — Platinum Rose Skill

> **Trigger:** Load this skill for any file that compares team names across data sources, builds score maps, grades bets, or looks up team aliases. Applies to: `scoresFetcher.js`, `picksDatabase.js`, `teamDatabase.js`, `gradeBankrollBet`, `bestEdges`, `CommandCenter.jsx`.

---

## The Core Problem

Team names come from at least 4 different sources in this codebase — ESPN, TheOddsAPI, G-Unit text, and user input — and they are **never the same format**. Direct string equality (`===`) between sources silently fails and produces wrong grades, missing matches, and false badges.

```
ESPN:          "Kansas Jayhawks"
TheOddsAPI:    "Kansas"
G-Unit text:   "Kansas -16.5"   (embedded in pick string)
User input:    "kansas"
```

---

## Which Function to Use

| Task | Use This | NEVER Use |
|---|---|---|
| Cross-source team name comparison | `normalizeTeamName(a) === normalizeTeamName(b)` | `a === b` raw string equality |
| Building score map keys | `addScoreToMap()` with 9-combo rule | Custom 3-key or 6-key variants |
| Grading bet home/away detection | `simplify(name)` | `normalizeTeamName()` — returns original string on failure |
| O(n) team lookups in loops | Pre-build a `Map` keyed by normalized name | `normalizeTeamName()` inside `.find()` or `.filter()` |
| Short display names | `getShortName()` from `teamDatabase.js` | Local copies in components |

---

## `normalizeTeamName(name)` — cross-source lookup

- Defined in `src/lib/teamDatabase.js`
- Resolves aliases → canonical team name via `TEAM_LOOKUP_MAP`
- **Critical quirk:** Returns the **original input string** (not `null`) on failure. Never use the return value as a "canonical" map key — a failed lookup returns the raw string, which creates phantom entries.
- Always use for **comparison** only: `normalizeTeamName(a) === normalizeTeamName(b)`

---

## `simplify(name)` — lightweight normalize

```js
// lowercase, strip apostrophes / dots / parens
simplify("St. John's (Red Storm)") → "st johns red storm"
```

- No database lookup — pure string transform
- Use for: home/away detection in `gradeBankrollBet`, score map key prefix generation
- Combine with `stripN(s, n)` to remove last n words (mascot stripping)

---

## The 9-Combo Score Map Rule (`addScoreToMap`)

To maximise fuzzy match coverage without `normalizeTeamName`, call `addScoreToMap` with **all 9 combinations** of independently stripping 0, 1, or 2 trailing words from each team name:

```js
for (let h = 0; h <= 2; h++) {
  for (let v = 0; v <= 2; v++) {
    addScoreToMap(map, stripN(simplify(home), h), stripN(simplify(visitor), v), score);
  }
}
// → 9 keys per game, e.g. "kansas jayhawks|missouri tigers",
//   "kansas jayhawks|missouri", "kansas|missouri", etc.
```

- Defined in `src/lib/scoresFetcher.js` — **never duplicate locally**
- The PicksTracker previously had a 3-key `addScoreToMap` — this was wrong. Always use the 9-key version from `scoresFetcher.js`.

---

## Alias Collision Policy

`TEAM_LOOKUP_MAP` is built with a simple `map[key] = canonical` loop — **last writer wins**. Any shared abbreviation across teams will be silently claimed by whichever team appears later in `TEAMS_DATABASE`.

**Known collision examples:**
| Abbreviation | Wrong winner (last in array) | Correct owner |
|---|---|---|
| `UNC` | Northern Colorado | **North Carolina** |
| `MSU` | Montana State | **Michigan State** |
| `ISU` | Indiana State | **Iowa State** |
| `BSU` | Ball State | **Boise State** |
| `CSU` | (3-way tie) | **Colorado State** |

**Rule:** Every ambiguous abbreviation must live in exactly **one** team's alias list — the dominant D1 brand. Use unique fallback codes for others (`UNCO`, `MTST`, `IDSU`, etc.).

**Before adding any team to `teamDatabase.js`:** run the alias collision checker:
```bash
npm run team:audit   # lists canonical teams with no aliases or collision risks
```

---

## O(n²) Warning — Normalize in Loops

Never call `normalizeTeamName()` inside `.find()` or `.filter()` inside `.map()`:

```js
// ❌ O(n²) — don't do this
const match = schedule.find(g => normalizeTeamName(g.home) === normalizeTeamName(team));

// ✅ O(1) — pre-build a Map
const normMap = new Map(schedule.map(g => [normalizeTeamName(g.home), g]));
const match = normMap.get(normalizeTeamName(team));
```

This pattern hit `gamesWithSplits` in `App.jsx` — now fixed via `gunitEdgeMap`.

---

## Checklist Before Writing Any Team Name Comparison

- [ ] Are the two strings from **different sources** (ESPN, OddsAPI, G-Unit, user input)? → **Must** use `normalizeTeamName()` on both sides
- [ ] Am I building a score map? → Use `scoresFetcher.js#addScoreToMap` with 9-combo rule
- [ ] Am I inside a `.find()` or `.filter()` loop? → Pre-build a `Map` — never call `normalizeTeamName` per iteration
- [ ] Am I grading home/away for a bet? → Use `simplify()`, not `normalizeTeamName()` (returns original on failure)
- [ ] Am I adding a new team alias? → Run `npm run team:audit` and check for collisions first
- [ ] Am I using `getShortName()`? → Import from `teamDatabase.js`, never define locally in a component
