# Context Mode: dev

> **Activated during:** Active feature development sprint.
> **When:** Running in a PM-delegated task with explicit file scope.

---

## Behavioral Rules

### ALLOWED

- Feature work within PM-assigned file scope
- New components, hooks, utils — in the correct directories per CLAUDE.md
- Tests for all new functionality
- Edits to `App.jsx` only with explicit PM task brief and lock

### RESTRICTED

- Edits outside the PM-delegated file scope require PM re-delegation
- No new npm dependencies without PM + creator approval
- No localStorage key changes without migration helper
- No changes to `AGENT_LOCK.json` (PM writes this only)

### FORBIDDEN

- Breaking changes to shared data contracts without migration
- Touching hot files (`App.jsx`, `storage.js`, `picksDatabase.js`) without explicit lock
- Committing directly to `main` without creator approval

---

## Quality Gate (self-enforced)

Before marking any task complete:

1. `npm run build` — 0 errors
2. Check for `console.log` in changed files
3. Confirm no localStorage key name was changed without a migration helper
4. Confirm changed files match PM-delegated scope
