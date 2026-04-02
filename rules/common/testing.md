# Testing Rules

## Core Rules

1. **Every bug fix gets a regression test** — no exceptions
2. **Tests must not depend on real data files** — mock `fetch`, `localStorage`, and Supabase
3. **Tests must not call real APIs** — mock all external endpoints
4. **Test file naming**: `{ComponentName}.test.jsx` or `{utilName}.test.js`
5. **Framework**: Vitest + React Testing Library (RTL) for unit/integration; Playwright for E2E

## Clock & Date Mocking

Always use `vi.useFakeTimers()` when testing date-dependent logic:

```js
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-10T12:00:00'));
});

afterEach(() => {
  vi.useRealTimers();
});
```

**Never** rely on `Date.now()` returning a specific value without fake timers.

## Isolating Real Data Files

Tests must never read from `public/schedule.json` or any real data file. Mock the fetch:

```js
vi.spyOn(global, 'fetch').mockResolvedValue({
  ok: true,
  json: () => Promise.resolve(mockScheduleData),
});
```

## Null / Undefined Robustness

Every component test should include at least one case with missing or empty props:

```js
it('renders without crashing when props are empty', () => {
  render(<PicksTracker picks={[]} />);
  expect(screen.getByText(/no picks/i)).toBeInTheDocument();
});

it('handles undefined schedule gracefully', () => {
  render(<Dashboard schedule={undefined} />);
  // Should not throw
});
```

## Async & Timers

```js
// ✅ Use findBy* for async content
const element = await screen.findByText('Loaded');

// ✅ Use waitFor for state updates
await waitFor(() => {
  expect(screen.getByText('Updated')).toBeInTheDocument();
});

// ❌ Never use arbitrary setTimeout in tests
// ❌ Never use sleep() or fixed delays
```

## File Coverage by Layer

| Layer | Files | Test Priority |
|-------|-------|---------------|
| Libs/utils | `src/lib/*.js` | HIGH — pure functions, easy to test |
| Hooks | `src/hooks/*.js` | HIGH — custom hooks with renderHook |
| Components | `src/components/**/*.jsx` | MEDIUM — RTL render + interaction |
| E2E flows | Full app | LOW priority, HIGH value — Playwright |

## Mock Strategy

### localStorage

```js
const mockStorage = {};
vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
  (key) => mockStorage[key] || null
);
vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
  (key, value) => { mockStorage[key] = value; }
);
```

### fetch

```js
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve(mockData),
});
```

### Supabase

```js
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ data: mockData, error: null }),
      upsert: () => ({ error: null }),
    }),
  },
}));
```

## Test Count Tracking

Maintain a running count of tests per category in `WORKING-CONTEXT.md`:

```
Tests: 12 unit | 4 integration | 1 e2e (smoke) | 0 failing
```

Update after every test session.

## Playwright E2E

- Config: `playwright.config.js` at repo root
- Specs: `tests/*.spec.js`
- Run: `npx playwright test`
- Smoke test (`tests/smoke.spec.js`) must always pass before any PR
