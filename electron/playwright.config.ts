// Playwright's config for the Electron app's E2E tests (`pnpm e2e:electron`),
// the base for porting the Maestro flows. Each test launches its own app
// (e2e/fixtures.ts), so tests run one at a time. Jest leaves e2e/ alone.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.e2e.ts',
  outputDir: '../build/electron/e2e/results',
  globalTeardown: './e2e/teardown.ts',
  timeout: 90_000,
  // On CI the whole run stops after 15 minutes, before its job's own limit
  // (electron.yml), so a run that crawls still ends with its report and the
  // traces of what failed, which a cancelled job never uploads.
  globalTimeout: process.env.CI ? 15 * 60_000 : undefined,
  expect: { timeout: 15_000 },
  // One Electron app at a time: each is a whole app with its own window.
  workers: 1,
  fullyParallel: false,
  // One retry on CI, for a trace of the failure; a test that passes only on
  // its retry still fails the run, so flakes don't pass as green.
  retries: process.env.CI ? 1 : 0,
  failOnFlakyTests: !!process.env.CI,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI
    ? [
        ['list'],
        [
          'html',
          { outputFolder: '../build/electron/e2e/report', open: 'never' },
        ],
      ]
    : [['list']],
  use: {
    // On failure only: a trace (actions, DOM snapshots, console) and a
    // screenshot of the window.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
  },
});
