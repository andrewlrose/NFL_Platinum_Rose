# nfl-podcast-service (M6)

Local Fastify service that ingests NFL podcasts, transcribes them with
faster-whisper, extracts picks with Ollama (qwen3:8b → GPT-4o fallback), and
serves digest pages over Tailscale + Funnel.

Spec: `/memories/repo/nfl-podcast-pipeline-spec.md` (Phases 1–9).
This README covers Phase 2 (the service skeleton). Phases 3+ (transcribe,
extract, vault rebuild, digest render, Funnel) land in subsequent commits.

---

## Layout

```
packages/m6-podcast-service/
├── package.json
├── .env.example
├── deploy/
│   └── nfl-podcast.service       # systemd unit
├── src/
│   ├── server.js                 # entry point
│   ├── app.js                    # Fastify factory (also imported by tests)
│   ├── config.js                 # env loader + defaults
│   ├── hmac.js                   # X-NFL-Signature validator
│   └── runRegistry.js            # in-memory run state (Phase 3 swaps the worker)
└── test/
    └── server.test.js            # Phase 2 acceptance tests
```

## Endpoints (Phase 2)

| Method | Path                          | Auth                | Status        |
|--------|-------------------------------|---------------------|---------------|
| GET    | `/health`                     | public (Tailscale)  | implemented   |
| POST   | `/ingest/run`                 | HMAC                | implemented (stub worker) |
| GET    | `/ingest/status/:run_id`      | HMAC                | implemented   |
| GET    | `/digest/episodes/:id.html`   | Tailscale-only      | 501 (Phase 7) |
| GET    | `/digest/experts/:slug.html`  | Tailscale-only      | 501 (Phase 7) |
| GET    | `/digest/weekly/:weekTag.html`| Tailscale-only      | 501 (Phase 7) |
| GET    | `/share/*`                    | Funnel + token      | 501 (Phase 8) |
| GET    | `/api/transcript/:id`         | Tailscale-only      | 501 (Phase 3) |

## Local development (Windows)

```powershell
cd packages\m6-podcast-service
copy .env.example .env
# leave NFL_PODCAST_HMAC_SECRET blank for dev — config.js falls back to
# 'dev-secret-do-not-use' when NODE_ENV != 'production'
npm install
npm test                 # vitest acceptance suite
npm run dev              # starts on http://127.0.0.1:5060
```

Verify the dev server:

```powershell
curl http://127.0.0.1:5060/health

# Sign a payload (PowerShell):
$secret = "dev-secret-do-not-use"
$body   = "{}"
$hmac   = [System.Security.Cryptography.HMACSHA256]::new([Text.Encoding]::UTF8.GetBytes($secret))
$sig    = "sha256=" + ([BitConverter]::ToString($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($body))) -replace '-','').ToLower()
curl -X POST http://127.0.0.1:5060/ingest/run -H "content-type: application/json" -H "x-nfl-signature: $sig" -d $body
```

## M6 deployment runbook

```bash
# 1. Sync code (one of):
cd ~/projects/NFL_Dashboard && git pull
# OR rsync from Windows over Tailscale

cd ~/projects/NFL_Dashboard/packages/m6-podcast-service
npm ci

# 2. Create the env file (root-owned, group-readable by service user)
sudo install -o root -g andrewlrose -m 0640 /dev/null /etc/nfl-podcast.env
sudo nano /etc/nfl-podcast.env   # fill in values from .env.example
#   NFL_PODCAST_HMAC_SECRET=$(openssl rand -hex 32)
#   SUPABASE_URL=...
#   SUPABASE_SERVICE_ROLE_KEY=...
#   OPENAI_API_KEY=...

# 3. Storage roots
sudo install -d -o andrewlrose -g andrewlrose /var/lib/nfl/audio
sudo install -d -o andrewlrose -g andrewlrose /var/lib/nfl/transcripts
sudo install -d -o andrewlrose -g andrewlrose /var/lib/nfl/digest
sudo install -d -o andrewlrose -g andrewlrose /var/log/nfl-podcast

# 4. Install systemd unit
sudo install -m 0644 deploy/nfl-podcast.service /etc/systemd/system/nfl-podcast.service
sudo systemctl daemon-reload
sudo systemctl enable --now nfl-podcast
sudo systemctl status nfl-podcast

# 5. Smoke-test locally
curl http://127.0.0.1:5060/health
```

## Operations

```bash
# Logs
journalctl -u nfl-podcast -f
journalctl -u nfl-podcast --since "1 hour ago"

# Restart
sudo systemctl restart nfl-podcast

# Restart-on-failure verification (Phase 2 acceptance E2)
sudo kill -9 $(systemctl show -p MainPID --value nfl-podcast)
# Watch: should be re-spawned within ~15s
sleep 20 && systemctl is-active nfl-podcast       # → active

# Rotate HMAC secret
sudo nano /etc/nfl-podcast.env                    # update NFL_PODCAST_HMAC_SECRET
sudo systemctl restart nfl-podcast
# then update the GHA secret used by .github/workflows/podcast-ingest.yml
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `EADDRINUSE :::5060` | another instance running | `sudo systemctl stop nfl-podcast` then re-check |
| 401 `bad_signature` | secret drift between cron and service | rotate secret in both places |
| `Missing required env var: NFL_PODCAST_HMAC_SECRET` on boot | `/etc/nfl-podcast.env` not loaded | check unit's `EnvironmentFile=` path + perms 0640 |
| Service exits immediately | `node` not found at `/usr/bin/node` | `which node` and update `ExecStart` |

## Phase 2 acceptance (per spec §3 Phase 2)

- [x] `GET /health` returns valid JSON
- [x] `POST /ingest/run` with valid HMAC starts a run, returns 202 + `run_id`
- [x] Invalid HMAC returns 401
- [ ] **Manual on M6:** service auto-restarts within 15s after `kill -9`
- [ ] **Manual on M6:** survives reboot (`systemctl is-enabled` = `enabled`)
