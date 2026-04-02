# Context Mode: review

> **Activated during:** Post-session code review.
> **Triggered by:** "review", "pr review", "look over", "second opinion", "code review"

---

## Behavioral Rules

### ALLOWED

- Read any file in the workspace
- Write a review report to `reports/` or `docs/`
- Fix what you find (with scope limited to the change delta)
- Call out security issues, OWASP violations, anti-pattern violations

### RESTRICTED

- No refactors outside the reviewed delta
- No new features while reviewing
- Fix scope: only lines directly related to the review finding

### FORBIDDEN

- Reviewing the full codebase when asked to review a PR — review git delta only

---

## Review Output Format

```
## Code Review — {session} — {date}

### CRITICAL (must fix before merge)
- [file:line] {finding}

### IMPORTANT (should fix soon)
- [file:line] {finding}

### ADVISORY (low priority / style)
- [file:line] {finding}

### Verdict: APPROVE / REQUEST CHANGES / BLOCK
```

---

## Anti-Pattern Priority List

Check in this order:
1. Security: hardcoded secrets, unescaped user input, unprotected API routes
2. Data integrity: localStorage key changes without migration, stale refs
3. Logic: date handling bugs (see CLAUDE.md anti-patterns — Date & Time section), team name comparison without normalization
4. Quality: `console.log` left in, uncaught promise rejections, missing error boundaries
