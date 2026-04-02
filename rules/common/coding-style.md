# Coding Style Rules

## Naming Conventions

| Thing            | Convention          | Example                        |
|------------------|---------------------|--------------------------------|
| Component        | PascalCase          | `PicksTracker.jsx`             |
| Hook             | `use` + camelCase   | `useAutoGrade.js`              |
| Utility/lib      | camelCase           | `picksDatabase.js`             |
| Constant         | SCREAMING_SNAKE     | `MAX_RETRY_COUNT`              |
| Event handler    | `handle` + Verb     | `handleClickSync`              |
| Boolean prop     | `is`/`has`/`show`   | `isOpen`, `hasEdge`            |
| Callback prop    | `on` + Event        | `onClose`, `onPickSaved`       |

## File Structure

- Components: `src/components/{category}/{ComponentName}.jsx`
- Hooks: `src/hooks/use{Name}.js`
- Libs/utils: `src/lib/{utilName}.js`
- Modals: `src/components/modals/{ModalName}Modal.jsx`
- Tests: `src/**/__tests__/*.test.{js,jsx}` or colocated `*.test.js`
- Data files: `public/*.json`

## Formatting Rules

1. **No `console.log` in production code** — use `console.warn` / `console.error` only for real issues
2. **Soft 100 char line limit** — break after 100; hard break at 120
3. **400 LOC limit per file** — if a component exceeds this, extract sub-components or utility functions
4. **Single responsibility** — each file does one thing; one default export per file
5. **Imports grouped** — React → third-party → @/ aliases → relative, blank line between groups

## React Conventions

- Functional components only (no class components)
- `export default function ComponentName()` preferred
- Destructure props in the function signature
- Default prop values in destructuring: `{ schedule = [], edges = [] }`
- Conditional rendering: `{condition && <Component />}` (not ternary for mount/unmount)
- Tab rendering: `{activeTab === 'tabname' && <Component />}`

## Import Rules

```js
// ✅ Correct order
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { loadFromStorage, saveToStorage } from '@/lib/storage';
import Header from '../layout/Header';

// ❌ Never
import * as Everything from './bigModule';  // No barrel imports
```

## Style Color Constants

| Token       | Hex         | Tailwind Class              | Usage                    |
|-------------|-------------|-----------------------------|--------------------------|
| primary     | `#00d2be`   | custom                      | Accent, buttons, links   |
| bg          | `#0f0f0f`   | `bg-[#0f0f0f]`             | App background           |
| positive    | emerald     | `text-emerald-400`          | Wins, profit, good edge  |
| negative    | rose        | `text-rose-400`             | Losses, negative EV      |
| neutral     | amber/slate | `text-amber-400`            | Pushes, neutral info     |
| ai-accent   | emerald     | `bg-emerald-500/20`         | AI Lab / DevLab          |
| selection   | teal        | `selection:bg-[#00d2be]`    | Text selection highlight |

## Anti-Patterns Quick Reference

> Full list in CLAUDE.md "Anti-Patterns to Avoid" section.

- No `setInterval` on rate-limited APIs
- No startup API fetch on page load
- No `.map()` on possibly-undefined arrays
- No `O(n²)` `.find()` inside `.map()` — use a `Map`
- No raw `localStorage.getItem/setItem` — use `storage.js` wrappers
- No hardcoded `/filename.json` — use `./` or `import.meta.env.BASE_URL`
- No reverting `React.lazy` tabs to static imports
