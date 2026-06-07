# NFL Dashboard — Feature & Architecture Backlog

> Persistent across sessions. Read at session start via HANDOFF_PROMPT.md Persistent Backlogs.
> Mark `[ ]` → `[x]` only when committed to `main` and verified.
> Add new items at the bottom of the appropriate section.

---

## Data Ingestion

### [ ] X/Twitter Sharp-Account Ingestion — proper implementation
**Added:** 2026-06-06
**Priority:** Medium (offseason — needed before in-season)
**Effort:** 1–2 sessions

**Background:**
`agents/x-sharp-ingest.js` (F-13) was built to fetch tweets from curated sharp NFL accounts
via RSSHub (X→RSS bridge, no API key needed). All RSS-backed accounts have been moved to
`research-intel-ingest.js` where they belong. The remaining sharp X-only accounts
(VSiN, ActionNetworkHQ, FantasyDouche/Levitan, MattEchols/SIS) are disabled because
public RSS feeds don't exist for them.

**Options (in priority order):**

1. **Self-host RSSHub on M6** ← recommended first step
   - RSSHub is open-source and already in use conceptually (rsshub.app is just broken/rate-limited)
   - M6 is already running services; adding RSSHub is a `docker run` or `npm install`
   - Unlocks any public X account's tweet feed for free, no X API key needed
   - RSSHub URL pattern: `http://localhost:1200/twitter/user/{handle}`
   - Set `RSSHUB_BASE_URL=http://localhost:1200` in `.env`; x-sharp-ingest picks it up automatically
   - Re-enable accounts in `config/sharp-accounts.json` by setting `active: true`

2. **X API Basic tier** ($100/month)
   - Required for Bookmarks API (OAuth 2.0 user-context)
   - Bookmarks approach: Creator manually bookmarks sharp tweets on the dedicated
     `@PlatinumRoseNFL` account during the week; agent reads bookmarks on demand
   - Endpoint: `GET /2/users/:id/bookmarks` (requires user OAuth, not just app-level)
   - Viable if M6 RSSHub proves unreliable, but costs money
   - **Manual fallback within this option:** If paid API is too expensive, Creator can
     maintain a weekly text/markdown file of interesting tweets pasted manually into
     `data/vault-seed/manual/` and vault-seed.js picks them up as intel notes

3. **Nitter self-host** (alternative to RSSHub)
   - Nitter provides RSS feeds for X accounts at `{nitter-instance}/handle/rss`
   - More fragile than RSSHub (Nitter instances go down); lower priority

**Implementation steps (Option 1):**
- [ ] Install RSSHub on M6: `docker run -d -p 1200:1200 diygod/rsshub` or `npx rsshub`
- [ ] Test feed: `curl http://localhost:1200/twitter/user/SharpFootball`
- [ ] Add `RSSHUB_BASE_URL=http://localhost:1200` to M6 `/etc/nfl-podcast.env` (or separate env)
- [ ] Re-enable target accounts in `config/sharp-accounts.json`
- [ ] Add `npm run ingest-x-sharp` script to `package.json`
- [ ] Add GHA or cron job to run x-sharp-ingest on a schedule (daily during season)
- [ ] Verify rows in `x_sharp_tweets` Supabase table

**Target accounts to re-enable (once RSSHub live):**
- `@VSiN` — sharp-money, line-movement, bookmaker intel
- `@ActionNetworkHQ` — picks, public-money, steam
- `@bettingpros` — consensus, best-bets
- `@FantasyDouche` (Adam Levitan) — DFS, props, targets, air-yards
- `@MattEchols` (SIS) — EPA, situational, run-pass analytics

---

## Agent / UI Features

*(add items here as they come up)*

---

## Infrastructure

*(add items here as they come up)*

---

## Progress Tracker

| Section | Total | Open | Done |
|---------|-------|------|------|
| Data Ingestion | 1 | 1 | 0 |
| Agent / UI Features | 0 | 0 | 0 |
| Infrastructure | 0 | 0 | 0 |
| **Total** | **1** | **1** | **0** |
