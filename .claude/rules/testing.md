---
inclusion: auto
description: Testing standards for NFL Platinum Rose
---

# NFL Platinum Rose — Testing Rules

## Core Rules

1. **Every bug fix gets a regression test** — no exceptions
2. **Tests must not depend on real data files** — mock `fetch`, `localStorage`, and Supabase
3. **Tests must not call real APIs** — mock all external endpoints
4. **Framework**: Vitest + React Testing Library (unit/integration); Playwright (E2E)

## File Naming

- `{ComponentName}.test.jsx` or `{utilName}.test.js`
- Colocated or under `src/**/__tests__/`

## Clock & Date Mocking

Always use `vi.useFakeTimers()` for date-dependent logic. Never rely on `Date.now()` without fakes.

## Null/Undefined Robustness

Every component test should include at least one case with missing or empty props.

## Async Patterns

- `findBy*` for async content
- `waitFor()` for state updates
- Never use `setTimeout` or fixed delays in tests

## Mock Strategy

- **localStorage**: `vi.spyOn(Storage.prototype, 'getItem/setItem')`
- **fetch**: `global.fetch = vi.fn().mockResolvedValue(...)`
- **Supabase**: `vi.mock('@/lib/supabase', ...)`

## Priority

| Layer | Priority |
| ----- | -------- |
| Libs/utils (`src/lib/*.js`) | HIGH — pure functions |
| Hooks (`src/hooks/*.js`) | HIGH — renderHook |
| Components | MEDIUM — RTL |
| E2E flows | LOW priority, HIGH value — Playwright |

## Pre-Merge Gate

Smoke test (`tests/smoke.spec.js`) must always pass before any PR.
