---
inclusion: auto
description: Security guardrails and secret management for NFL Platinum Rose
---

# NFL Platinum Rose — Security Guardrails

## Secrets Management

- **Never hardcode API keys** in source files — use `.env` and `import.meta.env.VITE_*`
- All endpoints and keys centralized in `src/lib/apiConfig.js`
- GHA-only secrets (no `VITE_` prefix) are NOT available in browser code
- `PR_OPENAI_KEY` in localStorage is user-provided, not a repo secret

### Protected Secrets (Never in Source)

| Secret | Scope |
| ------ | ----- |
| `VITE_ODDS_API_KEY` | Browser (TheOddsAPI) |
| `VITE_OPENAI_API_KEY` | Browser (OpenAI) |
| `VITE_SUPABASE_URL` | Browser (Supabase) |
| `VITE_SUPABASE_ANON_KEY` | Browser (Supabase) |
| `OPENAI_API_KEY` | GHA only |
| `GROQ_API_KEY` | GHA only |
| `ASSEMBLYAI_API_KEY` | GHA only |
| `SUPABASE_SERVICE_ROLE_KEY` | GHA only (bypasses RLS) |

## Hot File Protection

These files require PM lock in `AGENT_LOCK.json` before editing:

- `src/App.jsx` — tab routing, boot sequence
- `src/lib/storage.js` — localStorage key catalog
- `src/lib/picksDatabase.js` — picks data layer
- `AGENT_LOCK.json` — concurrency control
- `CLAUDE.md` — project governance

## Quality Gates

- No `console.log` in production code — use `console.warn`/`console.error` for real issues
- No `--no-verify` on git commits
- Conventional commit format required: `type(scope): description`
- ESLint must pass on all changed JS/JSX files
- Tests must pass before closing tasks

## Anti-Patterns (Read `docs/ANTI_PATTERNS.md` Before Touching)

- No `setInterval` on rate-limited APIs
- No startup API fetch on page load
- No `.map()` on possibly-undefined arrays
- No `O(n^2)` `.find()` inside `.map()` — use a `Map`
- No raw `localStorage.getItem/setItem` — use `storage.js` wrappers
- No hardcoded `/filename.json` — use `./` or `import.meta.env.BASE_URL`
- No reverting `React.lazy` tabs to static imports
