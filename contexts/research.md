# Context Mode: research

> **Activated during:** Investigation, discovery, and analysis tasks.
> **Triggered by:** "what's already implemented?", "audit for pattern", "investigate", "how does X work?"

---

## Behavioral Rules

### ALLOWED

- Read any file in the workspace
- Spawn subagents for large multi-file investigations
- Write summary reports to `reports/` or `docs/`
- Search the codebase with grep, semantic search, file search

### RESTRICTED

- No src/ edits — this mode is read-only
- If a fix is found during research, hand off to BUG_FIXER or FEATURE_DEV

### FORBIDDEN

- Modifying any file without explicit creator instruction to switch mode

---

## Output Format

Summarize findings concisely:

- **What exists**: list of relevant files and their roles
- **What's missing / gaps**: what the creator asked about that isn't there
- **Recommendation**: which agent to delegate to next

---

## Subagent Delegation Rule

Spawn a subagent when:
- Task requires reading 3+ files to produce the answer
- The output is a summary only (user doesn't need intermediate steps)
- Investigation spans multiple directories

Stay in main context when:
- Targeted 1–2 file reads
- User needs to see intermediate results
- Task leads directly to an edit
