// The fixtures every Electron E2E test uses: `app`, a learnX launched for
// this test alone with a throwaway data folder (`dataDir`, deleted
// afterwards), `window`, its window, `main`, the main-process stand-ins
// (mainProcess.ts), installed before the test starts, `login`, the mock login
// of the Maestro flows' subflows/login-form.yaml, and `relaunch`, which quits
// the app and starts it again on the same data folder, as a flow's
// `launchApp` does.
//
// By default it runs this checkout in Electron (a dev run, as `pnpm
// electron` does, on the web build in build/electron/web). Set
// LEARNX_E2E_APP to a packaged app's executable to test that instead
// (build/electron/dist/win-unpacked/learnX.exe, linux-unpacked/learnx).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  _electron as electron,
  type ElectronApplication,
  type Page,
  test as base,
  type TestInfo,
} from '@playwright/test';
import { parse } from 'dotenv';
import { electronExecutable, outDir } from '../electronApp.ts';
import { text } from './maestroEnv.ts';
import { mainProcess, type MainProcess } from './mainProcess.ts';

const electronDir = path.join(import.meta.dirname, '..');
const root = path.join(electronDir, '..');

/** The mock account's files (`main.serveSites`). */
export const mockFilesDir = path.join(root, 'mock-files');

/** The packaged app under test, if any (LEARNX_E2E_APP). */
export const packagedApp = process.env.LEARNX_E2E_APP;

/** The mock login, from .env as the web build inlined it. */
export const mockLogin = () => {
  const env = parse(fs.readFileSync(path.join(root, '.env'), 'utf8'));
  if (!env.DUMMY_USERNAME || !env.DUMMY_PASSWORD) {
    throw new Error('.env has no mock login (DUMMY_USERNAME, DUMMY_PASSWORD)');
  }
  return { username: env.DUMMY_USERNAME, password: env.DUMMY_PASSWORD };
};

/**
 * Logs in with the mock account and closes the set-up page, as the Maestro
 * flows' subflows/login-form.yaml does.
 */
export const logIn = async (page: Page) => {
  const { username, password } = mockLogin();
  // A new install opens on the welcome page, then the login page.
  const welcome = page.getByTestId('welcome-continue');
  const usernameField = page.getByTestId('login-username');
  await welcome.or(usernameField).first().waitFor();
  if (await welcome.isVisible()) {
    await welcome.click();
  }
  await usernameField.fill(username);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-password').press('Enter');
  await loginSubmitted(page);
};

/**
 * After the mock account's password is submitted on the login page: closes
 * the set-up page that a typed mock login opens, since it starts over from the
 * mock data (data/login.ts), and waits for Today. Maestro's
 * subflows/login-submitted.yaml does the same.
 */
export const loginSubmitted = async (page: Page) => {
  await page.getByRole('button', { name: text('T_notNow') }).click();
  await page.getByTestId('today').waitFor();
};

/**
 * On CI under Linux's X11, which has no display, each worker's apps get an
 * X server of their own (Xvfb, from the xvfb package). The Wayland run
 * (WAYLAND_DISPLAY) has its own compositor; locally the apps use your
 * display.
 */
const ownDisplay =
  process.platform === 'linux' &&
  !!process.env.CI &&
  !process.env.WAYLAND_DISPLAY;

/** Starts an Xvfb on a free display; its number, as `:N`. */
const startXvfb = () =>
  new Promise<{ display: string; stop: () => void }>((resolve, reject) => {
    // -displayfd: Xvfb picks a free display and writes its number to fd 3.
    const xvfb = spawn(
      'Xvfb',
      ['-displayfd', '3', '-screen', '0', '1280x1024x24', '-nolisten', 'tcp'],
      { stdio: ['ignore', 'ignore', 'pipe', 'pipe'] },
    );
    let errors = '';
    xvfb.stderr!.on('data', chunk => (errors += chunk));
    xvfb.on('error', reject);
    xvfb.on('exit', code =>
      reject(
        new Error(`Xvfb exited (${code}) before its display was up: ${errors}`),
      ),
    );
    let number = '';
    xvfb.stdio[3]!.on('data', chunk => {
      number += chunk;
      if (number.includes('\n')) {
        resolve({ display: `:${number.trim()}`, stop: () => xvfb.kill() });
      }
    });
  });

/** How a test launches learnX. */
export interface Launch {
  /**
   * The test run's launch options (src/services/launchOptions), as the
   * Maestro flows pass them to `launchApp`. A packaged app ignores them.
   */
  launchOptions?: Record<string, unknown>;
  /** More arguments for the app, such as `--learnx-open=schedule`. */
  args?: string[];
  /** More environment variables, such as LEARNX_UPDATE_URL. */
  env?: Record<string, string>;
}

/** A running learnX: the app, its window and its main-process stand-ins. */
export interface Running {
  app: ElectronApplication;
  window: Page;
  main: MainProcess;
  /** Quits the app, once, and saves its trace (`launchApp`). */
  quit: () => Promise<void>;
}

interface WorkerFixtures {
  /** The X display the worker's apps use (`ownDisplay`), if not the run's. */
  xDisplay: string | undefined;
}

interface Fixtures {
  /**
   * The launch options of the test's first launch: `{ mockLatency: 'none' }`
   * unless a test sets others with `test.use({ appLaunchOptions })`
   * (Playwright's own `launchOptions` is for browsers).
   */
  appLaunchOptions: Record<string, unknown>;
  /** More arguments and environment for the first launch (`Launch`). */
  appLaunch: Omit<Launch, 'launchOptions'>;
  /** The app's language (`--lang`), English unless a test sets one. */
  language: string;
  /** The test's own data folder, deleted after it. */
  dataDir: string;
  /**
   * Every app the test launched, quit after it. A failed test's results keep
   * each app's trace.
   */
  launched: Running[];
  app: ElectronApplication;
  window: Page;
  main: MainProcess;
  /** Logs in with the mock account and closes the set-up page. */
  login: (window?: Page) => Promise<void>;
  /**
   * Quits the app and launches it again on the same data folder, with these
   * launch options (`{ mockLatency: 'none' }` unless given) and arguments.
   */
  relaunch: (launch?: Launch) => Promise<Running>;
}

/**
 * Launches learnX on `dataDir`, with the stand-ins installed. Its windows are
 * traced (actions, DOM snapshots, console and network) into `trace` when it
 * quits: Playwright's own `trace` option only records the test's side of an
 * Electron app.
 */
const launchApp = async (
  dataDir: string,
  language: string,
  xDisplay: string | undefined,
  { launchOptions = { mockLatency: 'none' }, args = [], env = {} }: Launch,
  trace: string,
): Promise<Running> => {
  const app = await electron.launch({
    // A launch takes a second or two. Without a limit of its own, one that
    // hangs (twice on Windows CI in a day of runs) waits out the test's
    // 90 s, and nothing ends the app: it keeps the data folder open, so its
    // deletion fails too. At its limit Playwright ends the app and reports
    // what it printed, which says where the launch stopped.
    timeout: 30_000,
    executablePath: packagedApp || electronExecutable(),
    // A packaged app reads no dev settings: Chromium's own switches keep
    // its data in the throwaway folder and its secrets out of the system's
    // keychain.
    args: packagedApp
      ? [
          `--user-data-dir=${dataDir}`,
          '--use-mock-keychain',
          `--lang=${language}`,
          ...args,
        ]
      : [electronDir, `--lang=${language}`, ...args],
    env: {
      ...process.env,
      ...(xDisplay ? { DISPLAY: xDisplay } : {}),
      LEARNX_DATA_DIR: dataDir,
      // Never in front: no Dock icon on a Mac, and the window never focused,
      // shown behind the others on Windows and Linux (electron/main.ts,
      // system.ts).
      LEARNX_E2E: '1',
      LEARNX_WEB_DIR: path.join(outDir, 'web'),
      LEARNX_LAUNCH_OPTIONS: JSON.stringify(launchOptions),
      // No update checks while testing (updater.ts), unless a test serves
      // one (LEARNX_UPDATE_URL).
      ...(env.LEARNX_UPDATE_URL ? {} : { LEARNX_NO_UPDATES: '1' }),
      ...env,
    },
  });
  await app.context().tracing.start({ snapshots: true, screenshots: true });
  // Nothing reaches the system from here on: dialogs, notifications, the
  // shell and menus are stand-ins.
  const main = mainProcess(app);
  await main.stub();
  let quitting: Promise<void> | undefined;
  const quit = () =>
    (quitting ??= (async () => {
      // An app that quit by itself has no trace left to save.
      await app
        .context()
        .tracing.stop({ path: trace })
        .catch(() => {});
      await app.close().catch(() => {});
    })());
  return { app, window: await app.firstWindow(), main, quit };
};

/** Where the test's next launched app saves its trace. */
const tracePath = (launched: Running[], testInfo: TestInfo) =>
  testInfo.outputPath(`app-${launched.length + 1}-trace.zip`);

export const test = base.extend<Fixtures, WorkerFixtures>({
  xDisplay: [
    // oxlint-disable-next-line no-empty-pattern -- Playwright reads fixtures' dependencies from the pattern
    async ({}, provide) => {
      if (!ownDisplay) {
        await provide(undefined);
        return;
      }
      const xvfb = await startXvfb();
      try {
        await provide(xvfb.display);
      } finally {
        xvfb.stop();
      }
    },
    { scope: 'worker' },
  ],
  appLaunchOptions: [{ mockLatency: 'none' }, { option: true }],
  appLaunch: [{}, { option: true }],
  language: ['en-US', { option: true }],

  // oxlint-disable-next-line no-empty-pattern -- Playwright reads fixtures' dependencies from the pattern
  dataDir: async ({}, provide) => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'learnx-e2e-'));
    try {
      await provide(dataDir);
    } finally {
      // Windows can hold a file of a just-closed app for a moment.
      fs.rmSync(dataDir, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 200,
      });
    }
  },

  // Closed before the data folder is deleted: Playwright tears a fixture
  // down before what it depends on.
  // oxlint-disable-next-line no-unused-vars -- a dependency only
  launched: async ({ dataDir: _ }, provide, testInfo) => {
    const launched: Running[] = [];
    try {
      await provide(launched);
    } finally {
      for (const running of launched) {
        await running.quit();
      }
      // A failed test's results keep the apps' traces; a passed test's keep
      // nothing, and its results folder goes when only they were in it.
      const failed = testInfo.status !== testInfo.expectedStatus;
      for (const [index] of launched.entries()) {
        const trace = testInfo.outputPath(`app-${index + 1}-trace.zip`);
        if (!fs.existsSync(trace)) {
          continue;
        }
        if (failed) {
          // A copy goes in the results' attachments.
          await testInfo.attach(`app ${index + 1} trace`, { path: trace });
        }
        fs.rmSync(trace);
      }
      const { outputDir } = testInfo;
      if (
        !failed &&
        fs.existsSync(outputDir) &&
        fs.readdirSync(outputDir).length === 0
      ) {
        fs.rmdirSync(outputDir);
      }
    }
  },

  app: async (
    { appLaunchOptions, appLaunch, language, dataDir, launched, xDisplay },
    provide,
    testInfo,
  ) => {
    const running = await launchApp(
      dataDir,
      language,
      xDisplay,
      { launchOptions: appLaunchOptions, ...appLaunch },
      tracePath(launched, testInfo),
    );
    launched.push(running);
    await provide(running.app);
  },

  window: async ({ app, launched }, provide) => {
    await provide(launched.find(running => running.app === app)!.window);
  },

  main: async ({ app, launched }, provide) => {
    await provide(launched.find(running => running.app === app)!.main);
  },

  login: async ({ window }, provide) => {
    await provide(async (page = window) => logIn(page));
  },

  relaunch: async (
    { language, dataDir, launched, xDisplay },
    provide,
    testInfo,
  ) => {
    await provide(async (launch = {}) => {
      // The single-instance lock lives in the data folder: the old app must
      // be gone before the new one starts.
      for (const running of launched) {
        await running.quit();
      }
      const running = await launchApp(
        dataDir,
        language,
        xDisplay,
        launch,
        tracePath(launched, testInfo),
      );
      launched.push(running);
      return running;
    });
  },
});

export { expect } from '@playwright/test';
