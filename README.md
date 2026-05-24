# NFL Platinum Rose Dashboard

Personal NFL analytics dashboard for in-season betting research and bankroll tracking.
Built with React + Vite + Tailwind CSS, backed by Supabase.

> **Entertainment only** — not financial advice. Must be 21+ to wager legally.

---

## Features

- **Live Odds Center** — spread, moneyline, totals via TheOddsAPI proxy
- **Betting Splits** — Action Network public-money percentages per game
- **Expert Consensus** — track pick records across analysts by category
- **Picks Tracker** — log, grade, and analyse your own picks
- **Bankroll Dashboard** — unit-based tracking, Kelly sizing, analytics
- **Matchup Wizard** — injury reports, situational splits, simulation
- **AI Agent Chat** — Claude-powered analysis via OpenAI-compatible proxy
- **Props Agent** — player-prop research assistant

---

## Local Development

### Prerequisites

- Node.js ≥ 20
- Supabase CLI (`npm i -g supabase`)
- A Supabase project (see Secrets section)

### Install

```bash
npm install
```

### Secrets

Copy the local secrets template and fill in your values:

```bash
cp supabase/functions/.env.local.example supabase/functions/.env.local
```

Required keys:

| Variable | Where to get it |
|---|---|
| `SUPABASE_URL` | Supabase project → Settings → API |
| `SUPABASE_ANON_KEY` | Supabase project → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API |
| `ODDS_API_KEY` | [TheOddsAPI](https://the-odds-api.com) dashboard |
| `OPENAI_API_KEY` | [OpenAI](https://platform.openai.com) / [Anthropic](https://console.anthropic.com) dashboard |

### Dev Server

```bash
npm run dev
```

App runs at `http://localhost:5173/platinum-rose-app/`

---

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start local dev server |
| `npm run build` | Production build (output → `dist/`) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint (0 errors required for CI) |
| `npm test` | Vitest unit test suite |
| `npm run test:coverage` | Tests with coverage report |

---

## Deployment

Deployed to GitHub Pages via GitHub Actions.

- **CI workflow** (`ci.yml`): runs lint + tests on every push
- **Deploy workflow** (`deploy.yml`): triggers on CI success, deploys `dist/` to `gh-pages` branch
- **Base path**: `/platinum-rose-app/` (configured in `vite.config.js`)

Secrets required in GitHub repo settings:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

---

## Agent Architecture

Scheduled data ingestion runs as Node.js agents (GitHub Actions cron or manual trigger):

| Agent | Purpose | Schedule |
|---|---|---|
| `agents/game-odds-ingest.js` | Fetches spreads/totals from TheOddsAPI | Hourly during season |
| `agents/betting-splits-ingest.js` | Fetches public-money splits from Action Network | Every 6h during season |
| `agents/injury-ingest.js` | ESPN unofficial injury endpoint | Daily |

Shared utilities: `packages/shared/src/week-utils.js` — DST-safe NFL week calculation.

Edge Functions (Supabase): `supabase/functions/ai-proxy/` and `supabase/functions/odds-proxy/` wrap external API calls and keep keys server-side.

---

## Project Structure

```
src/
  App.jsx               Entry point, sync orchestration
  lib/                  Pure utility modules (logger, oddsApi, syncQueue, …)
  hooks/                React hooks (useSchedule, useExperts, useAutoGrade, …)
  components/           UI components organised by feature
agents/                 Node.js data-ingest agents
packages/shared/src/    Shared JS utilities (week-utils, …)
supabase/
  functions/            Edge Functions (ai-proxy, odds-proxy)
  migrations/           SQL migrations (apply with `supabase db push`)
```

---

## Preseason Activation Checklist

See `memories/nfl-preseason-checklist.md` for the annual pre-Week-1 verification list (API key rotation, RLS migrations, endpoint dry-runs).


The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
