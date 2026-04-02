# JavaScript Conventions

## Module System

- **ESM only** — `import`/`export`, never `require()`/`module.exports`
- One default export per file (components, hooks)
- Named exports for utility collections (`export { loadFromStorage, saveToStorage }`)
- Dynamic imports for code splitting: `const Module = React.lazy(() => import('./Module'))`

## Async Patterns

```js
// ✅ async/await everywhere
const data = await fetchOdds();

// ✅ useEffect with inner async
useEffect(() => {
  async function init() {
    const odds = await fetchOdds();
    setOdds(odds);
  }
  init();
}, []);

// ❌ Never .then() chains in React components
// ❌ Never top-level await in component files
```

## State Management

- `useState` + `useEffect` for all state — no Redux, no Zustand, no Context API (except ErrorBoundary)
- Lift state to nearest common ancestor, pass down via props
- localStorage is the persistence layer (via `storage.js`)
- Supabase is the sync layer (fire-and-forget)

## Performance

```js
// ✅ useMemo for expensive computations
const sorted = useMemo(() => heavySort(picks), [picks]);

// ✅ useCallback for handlers passed to memoized children
const handleSave = useCallback(() => { /* ... */ }, [deps]);

// ✅ React.memo for pure display components
const GameCard = React.memo(function GameCard({ game }) { /* ... */ });

// ✅ Map for O(1) lookups (never .find() inside .map())
const gameMap = new Map(games.map(g => [g.id, g]));
picks.map(p => gameMap.get(p.gameId));

// ✅ React.lazy for non-landing tabs (already implemented)
const PicksTracker = React.lazy(() => import('./components/picks-tracker/PicksTracker'));
```

## Error Handling

- `<ErrorBoundary>` wraps each major section in App.jsx
- Async data functions return `{ data, loading, error }` shape
- Never let errors propagate silently — at minimum `console.error`
- API failures → show user-facing fallback, never blank screen

```js
// ✅ Standard async data pattern
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

try {
  const result = await fetchData();
  setData(result);
} catch (err) {
  console.error('fetchData failed:', err);
  setError(err.message);
} finally {
  setLoading(false);
}
```

## Environment Variables

- Prefix: `VITE_` for all browser-accessible env vars
- Access: `import.meta.env.VITE_KEY_NAME`
- Centralized in `src/lib/apiConfig.js`
- Never hardcode API keys in source files
- GHA-only secrets (no `VITE_` prefix) are not available in browser code

## Comments

```js
// ✅ TODO with context
// TODO: Add line movement chart after Supabase migration

// ✅ Brief explanation of non-obvious logic
// ESPN uses team ID, not abbreviation, for injury endpoint

// ❌ Never comment obvious code
// ❌ Never leave commented-out code blocks
```

## Tailwind CSS

- Use utility classes directly in JSX — no separate CSS files per component
- **Never** concatenate dynamic class strings:

```jsx
// ❌ Tailwind can't tree-shake dynamic strings
<div className={`text-${color}-400`} />

// ✅ Use conditional objects or clsx
<div className={clsx(
  'text-sm font-medium',
  isPositive ? 'text-emerald-400' : 'text-rose-400'
)} />
```

- App-level styles in `src/App.css` and `src/index.css` only
- Selection highlight: `selection:bg-[#00d2be] selection:text-black`

## Git Conventions

- Branch: `main` (production)
- Commit messages: descriptive, imperative mood
  - `Phase 1: Governance foundation (SOUL, RULES, WORKING-CONTEXT, TASK_BOARD, AGENTS)`
  - `Fix: UTC date offset in picks grading`
  - `Add: Futures portfolio hedge calculator`
- No force-push to `main`
- Verify build passes before committing src/ changes
