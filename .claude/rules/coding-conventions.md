---
inclusion: auto
description: Coding standards and React patterns for NFL Platinum Rose
---

# NFL Platinum Rose — Coding Conventions

## Module System
- **ESM only** — `import`/`export`, never `require()`
- One default export per file (components, hooks)
- Named exports for utility collections
- Dynamic imports for code splitting via `React.lazy()`

## Naming
| Thing | Convention | Example |
|-------|-----------|---------|
| Component | PascalCase | `PicksTracker.jsx` |
| Hook | `use` + camelCase | `useAutoGrade.js` |
| Utility/lib | camelCase | `picksDatabase.js` |
| Constant | SCREAMING_SNAKE | `MAX_RETRY_COUNT` |
| Event handler | `handle` + Verb | `handleClickSync` |
| Boolean prop | `is`/`has`/`show` | `isOpen`, `hasEdge` |
| Callback prop | `on` + Event | `onClose`, `onPickSaved` |

## File Structure
- Components: `src/components/{category}/{ComponentName}.jsx`
- Hooks: `src/hooks/use{Name}.js`
- Libs/utils: `src/lib/{utilName}.js`
- Modals: `src/components/modals/{ModalName}Modal.jsx`
- Tests: colocated `*.test.js` or `src/**/__tests__/*.test.{js,jsx}`

## React Rules
- Functional components only — no class components
- `export default function ComponentName()` preferred
- Destructure props in function signature with defaults
- `useState` + `useEffect` for all state — no Redux, Zustand, or Context API (except ErrorBoundary)
- `useMemo` for expensive computations, `useCallback` for handlers passed to memoized children
- `React.memo` for pure display components
- `Map` for O(1) lookups — never `.find()` inside `.map()`

## Imports Order
React → third-party → `@/` aliases → relative, blank line between groups

## Tailwind CSS
- Utility classes directly in JSX — no separate CSS files per component
- Never concatenate dynamic class strings (`text-${color}-400`)
- Use `clsx` for conditional classes
- App-level styles in `src/App.css` and `src/index.css` only

## Limits
- Soft 100 char line limit, hard break at 120
- 400 LOC max per file — extract sub-components or utilities if exceeded
- Single responsibility — one default export per file

## Comments
- TODO with context: `// TODO: Add line movement chart after Supabase migration`
- Brief explanation for non-obvious logic
- Never comment obvious code or leave commented-out blocks
