# NFL Podcast Pipeline — PM Handoff

Last updated: 2026-06-03

## Current Status

Phase 6 is shipped through 6e.

- 6a commit `84ef3aa` — added 6 Supabase query helpers in `src/lib/supabase.js` plus `tests/unit/podcastQueries.test.js` (12/12 green).
- 6b commit `7a0df43` — wired 6 podcast intel tools into `src/lib/agentTools.js` via `PODCAST_INTEL_TOOLS`, added executor coverage in `tests/unit/agentTools.test.js` (54/54 green across targeted suites with 6a).
- 6c commit `24e4174` — created `agents/manifests/futures.manifest.json` with season-arc prompt and tool subset.
- 6d commit `3ad5fc6` — added `src/components/agent/FuturesAgentChat.jsx`, App route, and Header nav tab. Build green.
- 6e commit lands after this handoff update — adds the 6 podcast intel tools to `agents/manifests/betting.manifest.json` so the manifest matches the shipped tool surface.

## Important Divergence From Spec

Spec section 3 / Phase 6 said the FUTURES agent should live at `?tab=futures`.

That route already existed for `FuturesPortfolio`, so the agent was intentionally added at `?tab=futures-agent` to avoid breaking the current portfolio surface. This divergence is already called out in the 6d commit message.

## Files Touched In Phase 6

- `src/lib/supabase.js`
- `tests/unit/podcastQueries.test.js`
- `src/lib/agentTools.js`
- `tests/unit/agentTools.test.js`
- `agents/manifests/futures.manifest.json`
- `src/components/agent/FuturesAgentChat.jsx`
- `src/App.jsx`
- `src/components/layout/Header.jsx`
- `agents/manifests/betting.manifest.json`

## Remaining Work After Phase 6

Phase 7 is the next real block.

### 7a. Static digest renderer on M6

Build the render layer under `packages/m6-podcast-service/render/`.

Targets:

- `episodes/<id>.html`
- `experts/<slug>.html`
- `experts/<slug>/<season>-W<week>.html`
- `weekly/<season>-W<week>.html`

Requirements:

- Shared template partials so one style change hits all page types.
- No client JS dependency; static HTML only.
- Re-render after each podcast pipeline run.
- Output to `/var/lib/nfl/digest/`.

### 7b. SPA podcast digest surface

Add a new dashboard tab for podcast digests.

Expected component shape:

- `src/components/podcasts/PodcastDigestTab.jsx`
- route: probably `?tab=podcasts`
- lists episodes from Supabase
- opens M6 digest pages
- includes a Share action that copies the signed `/share/...` URL once Phase 8 exists

### 7c. Daily brief integration

Update `agents/nfl-daily-brief.js` to include a “Top Podcast Picks (Last 24h)” block.

Guardrail:

- If M6 is unavailable, degrade to a plain “M6 unavailable” note rather than failing the brief.

## Known Follow-Ups / Gaps

- `agents/manifests/futures.manifest.json` records three spec-listed tools under `deferredTools` because they do not exist yet in `src/lib/agentTools.js`:
  - `analyze_futures_hedge`
  - `project_division_paths`
  - `track_award_race`
- The FUTURES chat currently reuses `BETTING_TOOLS` and relies on the system prompt to bias tool choice. That is acceptable for now because the tool surface already contains the futures-relevant subset.

## Validation Commands

Use these before any new Phase 7 commit:

```powershell
cd e:\dev\projects\NFL_Dashboard
npx vitest run tests/unit/agentTools.test.js tests/unit/podcastQueries.test.js
npm run build
```

## Pull / Sync Check

Before starting on another machine:

```powershell
cd e:\dev\projects\NFL_Dashboard
git fetch origin
git status -sb
git log --oneline origin/main -5
```

Expected state after this handoff closes:

- `main` equals `origin/main`
- latest commits include 6b / 6c / 6d / 6e in order

## Local Artifact Note

There are currently untracked local docs/image artifact directories in one working copy:

- `docs/Futures_Odds/`
- `docs/Screenshots/`

They are not part of Phase 6 and were intentionally not included in the feature commits. Treat them as local-only unless Andy explicitly wants them versioned.
