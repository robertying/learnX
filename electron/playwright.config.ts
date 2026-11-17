// Playwright's config for the Electron app's E2E tests (`pnpm e2e:electron`),
// the base for porting the Maestro flows. Each test launches its own app
// (e2e/fixtures.ts). Jest leaves e2e/ alone.
import { availableParallelism } from 'node:os';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.e2e.ts',
  outputDir: '../build/electron/e2e/results',
  globalSetup: './e2e/setup.ts',
  globalTeardown: './e2e/teardown.ts',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // On CI, one app per core: every test has its own data folder and ports,
  // and tests are spread one by one rather than by file, so the long files
  // (updates, errors) don't end up on one worker. Locally one app at a time,
  // so the windows don't pile up on the desktop you're using.
  workers: process.env.CI ? availableParallelism() : 1,
  fullyParallel: true,
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
