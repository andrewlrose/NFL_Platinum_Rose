# HANDOFF_PROMPT.md — NFL Platinum Rose

> **Rolling session handoff. Overwritten at every session close via `/handoff`.**
> **Next session: read this file first, then `WORKING-CONTEXT.md`.**

---

## Last Session Summary

**Session:** F-6 — BETTING Agent Chat POC
**Date:** 2026-04-02
**Branch:** `main`

### CRITICAL
- F-6 is **DONE** and pushed. HEAD `63728ca` is live on `origin/main`.
- Three new files: `src/lib/anthropicClient.js`, `src/lib/agentTools.js`, `src/components/agent/AgentChat.jsx`.
- New "Agent" tab added to Header nav and App.jsx (lazy-loaded, 26KB chunk).

### IMPORTANT
- The BETTING agent uses `VITE_ANTHROPIC_API_KEY` from `.env` (or user-entered key persisted to `nfl_betting_agent_apikey_v1` localStorage). Add key to `.env` to skip the setup screen.
- Model configured as `claude-sonnet-4-5` per `betting.manifest.json`. If that model ID isn't available yet, change `MODEL_DEFAULT` in `apiConfig.js` to `claude-3-5-sonnet-20241022`.
- Agent tab wired as lazy chunk — stays lazy per anti-pattern rule.
- 7 tools implemented: `get_odds`, `get_line_movement`, `analyze_matchup`, `get_injury_report`, `calculate_hedge`, `calculate_teaser`, `log_pick`.
- `log_pick` confirmation handled via system prompt instruction (agent asks before calling).
- `TASK_BOARD.md` updated: F-6 in DONE, next backlog item is **F-7: DFS Lineup Agent** (P2).

### Blockers
None.

### What Was Done
- Added `VITE_ANTHROPIC_API_KEY` + `ANTHROPIC_API` config block to `apiConfig.js`
- Created `src/lib/anthropicClient.js` — fetch-based Anthropic Messages API client with multi-step tool loop (`runAgentTurn`), step callback, and `extractFinalText`/`extractToolCalls` helpers
- Created `src/lib/agentTools.js` — full Anthropic-format tool definitions (7 tools) + dispatcher (`executeTool`) + tool implementations pulling from Supabase, localStorage, schedule.json, ESPN, and pure math
- Created `src/components/agent/AgentChat.jsx` — full chat UI: API key setup screen, status bar, message rendering with inline tool call cards, typing indicator, context loader (picks/bankroll/futures/schedule), chat history persistence, BETTING agent system prompt
- Added `MessageSquare` icon import + `"Agent"` NavTab to `Header.jsx`
- Added `const AgentChat = lazy(...)` + `{activeTab === 'agent' && <AgentChat />}` to `App.jsx`
- Updated `TASK_BOARD.md`: F-6 moved to DONE

### Files Modified This Session
- **Created:** `src/lib/anthropicClient.js`, `src/lib/agentTools.js`, `src/components/agent/AgentChat.jsx`
- **Modified:** `src/lib/apiConfig.js`, `src/components/layout/Header.jsx`, `src/App.jsx`, `TASK_BOARD.md`

---

## Current State

```
Branch: main
HEAD: 63728ca — F-6: BETTING Agent Chat POC
Tree: clean
Tests: Playwright smoke test exists (not run this session)
Remote: origin/main synced at 63728ca
```

---

## What To Do Next

1. **Add `VITE_ANTHROPIC_API_KEY` to `.env`** — needed to skip the key setup screen in Agent tab
2. **Test the Agent tab** — open, enter API key, try "Analyze Chiefs vs Eagles" and "Show me line movements"
3. **If `claude-sonnet-4-5` model not yet available** — change `MODEL_DEFAULT` in `apiConfig.js` to `claude-3-5-sonnet-20241022`
4. **Next backlog item:** F-7 DFS Lineup Agent (P2) or F-8 Props Agent (P2)

---

## Resume Command

```
Resume Platinum Rose NFL. HEAD = 63728ca (main). Suite: N/A. F-6 Agent Chat POC complete (BETTING agent live). Next: test agent tab + F-7 DFS agent or F-8 Props agent. Read HANDOFF_PROMPT.md for full context before touching any file.
```

