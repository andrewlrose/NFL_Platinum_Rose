---
name: deployment-flow
description: >
  NFL Dashboard deployment pipeline: GitHub Pages (Vite), GitHub Actions CD,
  Supabase production config, and Node.js pipeline agent environment. Use when
  working on production deployments, CI/CD workflows, or server-side agent config.
origin: nfl-dashboard
---

# Deployment Flow — NFL Platinum Rose

## When to Activate

- Working on `.github/workflows/` CI/CD files
- Debugging a failed GitHub Pages deployment
- Configuring Supabase production environment or running migrations
- Setting up environment variables for server-side agents
- Running or troubleshooting `agents/*.js` pipeline scripts

## Architecture

```
Developer push → main branch
        │
        ▼
GitHub Actions CI
  ├── lint (ESLint)
  ├── unit tests (Vitest)
  ├── Playwright smoke tests
  └── npm run build → dist/
        │
        ▼
GitHub Pages
  └── https://andrewlrose.github.io/platinum-rose-app/

Server-side agents (run locally or via GHA cron)
  ├── agents/futures-odds-ingest.js  — TheOddsAPI → Supabase
  ├── agents/nfl-auto-grade.js       — grade picks after game results land
  ├── agents/props-auto-grade.js     — grade prop picks
  └── agents/overnight.js            — weekly batch orchestrator

Supabase cloud (aambmuzfcojxqvbzhngp)
  ├── PostgreSQL (odds_snapshots, line_movements, game_results,
  │              futures_odds_snapshots, podcast_*, user_picks, user_bankroll_bets)
  └── No Edge Functions (all server logic runs client-side or in GHA)
```

## Vite / GitHub Pages Config

- **Base path:** `/platinum-rose-app/` — configured in `vite.config.js`
- **Public files:** NEVER fetch with hardcoded `/filename.json`. Always use
  relative `./filename.json` — the `/` prefix 404s on GitHub Pages.
- **Build output:** `dist/` — committed by GHA or via manual push to `gh-pages`
  branch.
- **Alias:** `@` → `./src` (configured in `vite.config.js`)

```bash
npm run dev        # Vite dev server — http://localhost:5173/platinum-rose-app/
npm run build      # Production build → dist/
npm run preview    # Preview production build locally
```

## GitHub Actions CD

Workflow files: `.github/workflows/`

**Required GitHub Secrets:**

| Secret | Purpose |
|--------|---------|
| `OPENAI_API_KEY` | GPT-4o extraction in pipeline agents |
| `GROQ_API_KEY` | Whisper transcription (priority 1) |
| `ASSEMBLYAI_API_KEY` | Paid transcription fallback |
| `SUPABASE_SERVICE_ROLE_KEY` | DB writes from CI agents (bypasses RLS) |
| `VITE_SUPABASE_URL` | Supabase project URL (public) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon JWT (public read) |
| `VITE_ODDS_API_KEY` | TheOddsAPI key |

Set `NFL_SKIP_HOOKS=true` as a GHA environment variable to disable all
Claude Code dev-time hooks during CI runs.

## Server-Side Agent Environment

All `agents/*.js` scripts run in Node.js and use `dotenv` to load `.env`.
Each agent must include at the top:

```js
import 'dotenv/config';
```

The `.env` file (gitignored) uses non-`VITE_` prefixed keys for server agents:

```
SUPABASE_URL=https://aambmuzfcojxqvbzhngp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
ODDS_API_KEY=...
OPENAI_API_KEY=...
```

Browser code uses `VITE_*` prefixed keys via `import.meta.env.VITE_*`.
Server agents use process.env directly (no `VITE_` prefix).
**Never mix these** — browser bundles will expose server keys if you use
non-`VITE_` keys in Vite code.

Pattern established: `agents/futures-odds-ingest.js` imports `dotenv/config`
at top. Apply this same pattern to `odds-ingest.js` and `nfl-auto-grade.js`
when those files are next touched.

## Supabase Production

- Project ID: `aambmuzfcojxqvbzhngp`
- Migrations: `supabase/migrations/001_init.sql` through latest
- Apply migrations via Supabase SQL Editor (CLI link requires same-account auth)
- RLS is enabled on ALL tables — anon key is read-only; service_role bypasses RLS
- **Never run `supabase db reset`** on the linked production project
- All tables have RLS enabled — verify with Supabase dashboard Security Advisor

## Build & Deploy Checklist

Before merging to main:

1. `npm run lint` — must pass clean
2. `npm run test` (Vitest) — all unit tests must pass
3. `npx playwright test tests/smoke.spec.js` — all 12 tabs must render
4. `npm run build` — confirm build succeeds; watch for base-path issues
5. Review any new `.env` variables — add to GitHub Secrets if needed by GHA
6. Run any pending Supabase migrations in SQL Editor
7. Push to main — GHA deploys to `gh-pages` branch automatically

## Dry-Run Pattern for Agents

All ingestion agents support a `--dry-run` flag that logs what would be written
without committing to Supabase. Always test with `--dry-run` before a live run:

```bash
node agents/futures-odds-ingest.js --dry-run
node agents/nfl-auto-grade.js --dry-run
```
