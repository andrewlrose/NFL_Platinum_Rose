import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright smoke-test config for NFL Platinum Rose.
 *
 * CI flow:
 *   1. `npm run build`   (GHA step)
 *   2. `npm run test:smoke` — starts preview server, runs Chromium tests
 *
 * Local:
 *   npm run build && npm run test:smoke
 */
export default defineConfig({
  testDir:   './tests',
  testMatch: '**/*.spec.js',

  // Fail fast on CI — one retry locally to reduce flake
  retries: process.env.CI ? 0 : 1,

  // Run tests sequentially (small suite, avoids port conflicts)
  workers: 1,

  reporter: process.env.CI
    ? [['github'], ['list']]
    : [['list']],

  use: {
    // Vite preview serves the built app at this base URL
    baseURL: 'http://localhost:4173/platinum-rose-app/',

    // Capture screenshots + traces on failure for easier debugging
    screenshot: 'only-on-failure',
    trace:      'on-first-retry',
    video:      'off',

    // Reasonable timeouts for a React SPA
    navigationTimeout: 20_000,
    actionTimeout:     10_000,
  },

  projects: [
    {
      name:    'chromium',
      use:     { ...devices['Desktop Chrome'] },
    },
  ],

  // Start a test build (VITE_BYPASS_AUTH=true) then `vite preview` before
  // running tests. reuseExistingServer skips this on localhost when a preview
  // server is already running (avoids double-build during local iteration).
  webServer: {
    command:           'npm run build:test && npm run preview',
    url:               'http://localhost:4173/platinum-rose-app/',
    reuseExistingServer: !process.env.CI,
    timeout:           120_000,
    stdout:            'ignore',
    stderr:            'pipe',
  },
});
