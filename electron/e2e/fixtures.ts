// The fixtures every Electron E2E test uses: `app`, a learnX launched for
// this test alone with a throwaway data folder (deleted afterwards), `window`,
// its window, `main`, the main-process stand-ins (mainProcess.ts), and
// `login`, the mock login of the Maestro flows' subflows/login-form.yaml.
//
// By default it runs this checkout in Electron (a dev run, as `pnpm
// electron` does, on the web build in build/electron/web). Set
// LEARNX_E2E_APP to a packaged app's executable to test that instead
// (build/electron/dist/win-unpacked/learnX.exe, linux-unpacked/learnx).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  _electron as electron,
  type ElectronApplication,
  type Page,
  test as base,
} from '@playwright/test';
import { parse } from 'dotenv';
import { electronExecutable, outDir } from '../electronApp.cjs';
import { mainProcess, type MainProcess } from './mainProcess';

const electronDir = path.join(__dirname, '..');
const root = path.join(electronDir, '..');

/** The mock login, from .env as the web build inlined it. */
const mockLogin = () => {
  const env = parse(fs.readFileSync(path.join(root, '.env'), 'utf8'));
  if (!env.DUMMY_USERNAME || !env.DUMMY_PASSWORD) {
    throw new Error('.env has no mock login (DUMMY_USERNAME, DUMMY_PASSWORD)');
  }
  return { username: env.DUMMY_USERNAME, password: env.DUMMY_PASSWORD };
};

interface Fixtures {
  /**
   * The test run's launch options (src/services/launchOptions), as the
   * Maestro flows pass them to `launchApp`: `{ mockLatency: 'none' }` unless
   * a test sets others with `test.use({ appLaunchOptions })` (Playwright's
   * own `launchOptions` is for browsers). A packaged app
   * ignores them.
   */
  appLaunchOptions: Record<string, unknown>;
  /** The app's language (`--lang`), English unless a test sets one. */
  language: string;
  app: ElectronApplication;
  window: Page;
  main: MainProcess;
  /** Logs in with the mock account and closes the set-up page. */
  login: () => Promise<void>;
}

export const test = base.extend<Fixtures>({
  appLaunchOptions: [{ mockLatency: 'none' }, { option: true }],
  language: ['en-US', { option: true }],

  app: async ({ appLaunchOptions, language }, provide) => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'learnx-e2e-'));
    const packaged = process.env.LEARNX_E2E_APP;
    const app = await electron.launch({
      executablePath: packaged || electronExecutable(),
      // A packaged app reads no dev settings: Chromium's own switches keep
      // its data in the throwaway folder and its secrets out of the system's
      // keychain.
      args: packaged
        ? [
            `--user-data-dir=${dataDir}`,
            '--use-mock-keychain',
            `--lang=${language}`,
          ]
        : [electronDir, `--lang=${language}`],
      env: {
        ...process.env,
        LEARNX_DATA_DIR: dataDir,
        LEARNX_WEB_DIR: path.join(outDir, 'web'),
        LEARNX_LAUNCH_OPTIONS: JSON.stringify(appLaunchOptions),
        // No update checks while testing (updater.cjs).
        LEARNX_NO_UPDATES: '1',
      },
    });
    try {
      await provide(app);
    } finally {
      await app.close().catch(() => {});
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  },

  window: async ({ app }, provide) => {
    await provide(await app.firstWindow());
  },

  main: async ({ app }, provide) => {
    const main = mainProcess(app);
    await main.stub();
    await provide(main);
  },

  login: async ({ window }, provide) => {
    await provide(async () => {
      const { username, password } = mockLogin();
      // A new install opens on the welcome page, then the login page.
      const welcome = window.getByRole('button', { name: 'Continue' });
      const usernameField = window.getByTestId('login-username');
      await welcome.or(usernameField).first().waitFor();
      if (await welcome.isVisible()) {
        await welcome.click();
      }
      await usernameField.fill(username);
      await window.getByTestId('login-password').fill(password);
      await window.getByTestId('login-password').press('Enter');
      await window.getByRole('button', { name: 'Not Now' }).click();
    });
  },
});

export { expect } from '@playwright/test';
