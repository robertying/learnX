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
  // On CI the whole run stops after 15 minutes, before its job's own limit
  // (electron.yml), so a run that crawls still ends with its report and the
  // traces of what failed, which a cancelled job never uploads.
  globalTimeout: process.env.CI ? 15 * 60_000 : undefined,
  expect: { timeout: 15_000 },
  // One app per core on CI, and per two cores (at most six) locally, leaving
  // room for what else runs: every test has its own data folder and ports,
  // and tests are spread one by one rather than by file, so the long files
  // (updates, errors) don't end up on one worker. The windows never come to
  // the front (electron/AGENTS.md), so they don't get in your way.
  workers: process.env.CI
    ? availableParallelism()
    : Math.min(6, Math.max(1, Math.floor(availableParallelism() / 2))),
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
