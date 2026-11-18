// A real update, end to end, as scripts/e2e/e2e-updater.sh does for the
// Android APKs: an installed learnX (NSIS on Windows, an AppImage on Linux)
// finds the next version on a stand-in for the mirror, downloads it, and
// Settings' Restart installs it and opens learnX again, which has to come
// back running the new version and stay up. Nothing is stood in for:
// updates.e2e.ts covers learnX's side on a dev run, this one the packaged
// app, electron-updater and the installer together.
//
// updateE2E.ts packages the two versions, signed with a throwaway key,
// installs the first, serves the second and runs this; on its own it skips.
//
// The app is started as a user starts it and driven over the DevTools
// protocol, not by Playwright's Electron launcher: the app the installer
// opens again inherits what the old one had open, Playwright's pipes to it
// too, so Playwright would wait for it to quit before it saw the old one
// had.
import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { type Browser, chromium, type Page } from '@playwright/test';
import { expect, logIn, test } from './fixtures.ts';
import { exact } from './maestroEnv.ts';
import { byId, openSettings } from './steps.ts';

/** The installed app (learnX.exe, or the AppImage), from updateE2E.ts. */
const executable = process.env.LEARNX_UPDATE_E2E_APP;
const from = process.env.LEARNX_UPDATE_E2E_FROM;
const to = process.env.LEARNX_UPDATE_E2E_TO;

test.skip(!executable, 'run by electron/updateE2E.ts, which installs the app');
// A second try would find the app already updated.
test.describe.configure({ retries: 0 });

/** The x.y.z of a version with the build number (packageConfig.ts). */
const release = (version: string) => version.split('.').slice(0, 3).join('.');

const powershell = (script: string) =>
  execFileSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', script],
    { encoding: 'utf8' },
  );
const quoted = (value: string) => `'${value.replaceAll("'", "''")}'`;

/**
 * The processes running the installed app's file as it is now: learnX.exe
 * (Windows can't replace an executable that's running), or the AppImage's
 * runtime (Linux shows one whose file was replaced as deleted).
 */
const runningInstalled = (): number[] => {
  if (process.platform === 'win32') {
    return powershell(
      [
        `$exe = ${quoted(executable!)}`,
        'Get-CimInstance Win32_Process -Filter "Name = \'learnX.exe\'" |',
        '  Where-Object { $_.ExecutablePath -eq $exe } |',
        '  ForEach-Object { $_.ProcessId }',
      ].join('\n'),
    )
      .split(/\s+/)
      .filter(Boolean)
      .map(Number);
  }
  return linuxProcesses(
    pid => fs.readlinkSync(`/proc/${pid}/exe`) === executable,
  );
};

/** Linux's processes for which `matches` holds. */
const linuxProcesses = (matches: (pid: string) => boolean): number[] =>
  fs
    .readdirSync('/proc')
    .filter(name => {
      try {
        return /^\d+$/.test(name) && matches(name);
      } catch {
        // Gone, or not ours.
        return false;
      }
    })
    .map(Number);

/**
 * The installed app's version: learnX.exe's, which the installer sets, or
 * the one in the AppImage's .desktop file (X-AppImage-Version, which
 * electron-builder writes), read without running it.
 */
const installedVersion = (): string => {
  if (process.platform === 'win32') {
    return release(
      powershell(
        `(Get-Item ${quoted(executable!)}).VersionInfo.ProductVersion`,
      ).trim(),
    );
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'learnx-appimage-'));
  try {
    execFileSync(executable!, ['--appimage-extract', 'learnx.desktop'], {
      cwd: dir,
      stdio: 'ignore',
    });
    const desktop = fs.readFileSync(
      path.join(dir, 'squashfs-root', 'learnx.desktop'),
      'utf8',
    );
    return release(/^X-AppImage-Version=(.+)$/m.exec(desktop)?.[1] ?? '');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

const isRunning = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
  });

/** The app's window, once its DevTools endpoint answers. */
const attach = async (port: number) => {
  let browser: Browser | undefined;
  await expect
    .poll(
      async () => {
        browser = await chromium
          .connectOverCDP(`http://127.0.0.1:${port}`)
          .catch(() => undefined);
        return !!browser;
      },
      { timeout: 60_000, message: 'learnX’s DevTools endpoint' },
    )
    .toBe(true);
  let window: Page | undefined;
  await expect
    .poll(
      () => {
        window = browser!
          .contexts()
          .flatMap(context => context.pages())
          .find(page => page.url().startsWith('app://learnx/'));
        return !!window;
      },
      { message: 'learnX’s window' },
    )
    .toBe(true);
  return { browser: browser!, window: window! };
};

let started: ChildProcess | undefined;
let browser: Browser | undefined;
test.afterEach(async () => {
  await browser?.close().catch(() => {});
  started?.kill();
  // The app the update opened, which nothing else closes: on Linux the
  // AppImage's runtime and the app it started (which has its APPIMAGE).
  const pids =
    process.platform === 'win32'
      ? runningInstalled()
      : linuxProcesses(
          pid =>
            fs.readlinkSync(`/proc/${pid}/exe`).startsWith(executable!) ||
            fs
              .readFileSync(`/proc/${pid}/environ`, 'utf8')
              .split('\0')
              .includes(`APPIMAGE=${executable}`),
        );
  for (const pid of pids) {
    try {
      process.kill(pid);
    } catch {
      // Already gone.
    }
  }
});

test('installs an update and comes back as the new version', async ({
  xDisplay,
}) => {
  test.setTimeout(5 * 60_000);
  expect(installedVersion()).toBe(from);
  const port = await freePort();
  started = spawn(
    executable!,
    ['--lang=en-US', `--remote-debugging-port=${port}`],
    {
      env: { ...process.env, ...(xDisplay ? { DISPLAY: xDisplay } : {}) },
      stdio: 'ignore',
    },
  );
  const attached = await attach(port);
  browser = attached.browser;
  const { window } = attached;
  await logIn(window);
  await openSettings(window);

  // Checked 10 seconds after launch, then downloaded: the AppImage only
  // the blocks that changed, the installer whole.
  const row = byId(window, 'settings-update');
  await expect(row).toContainText(to!, { timeout: 3 * 60_000 });
  await row.click();
  const before = new Set(runningInstalled());
  await window
    .getByRole('dialog')
    .getByRole('button', { name: exact('T_restart') })
    .click();
  // The app quits into the installer: learnX.exe, or the AppImage's runtime
  // once the app it ran has.
  const old = started;
  await expect
    .poll(() => old.exitCode !== null || old.signalCode !== null, {
      timeout: 60_000,
      message: 'learnX quit',
    })
    .toBe(true);
  started = undefined;
  await browser.close().catch(() => {});
  browser = undefined;

  // The installer opens the app again once it's done, now the new version.
  const relaunched = () => runningInstalled().filter(pid => !before.has(pid));
  await expect
    .poll(() => relaunched().length, {
      timeout: 2 * 60_000,
      message: 'learnX opened again after the update',
    })
    .toBeGreaterThan(0);
  expect(installedVersion()).toBe(to);
  // And stays up: a second instance (one that started while the old one
  // still held the single-instance lock) hands over and quits at once.
  const pids = relaunched();
  await new Promise(resolve => setTimeout(resolve, 5000));
  expect(pids.some(isRunning)).toBe(true);
});
