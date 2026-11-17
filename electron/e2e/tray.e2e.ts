// The tray (desktop.cjs): closing the window keeps learnX running there, its
// menu brings the window back, runs the background sync now (services/
// background, as the main process's timer does every 15 minutes) and quits.
// The test chooses the menu's items as a click would (mainProcess.ts).
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from './fixtures';
import { exact } from './maestroEnv';
import { byId } from './steps';

interface SyncRun {
  status: string;
  courses?: Record<string, { fetched: number; total: number }>;
}

/** The background syncs the app saved (data/syncLog), oldest first. */
const syncRuns = (dataDir: string): SyncRun[] => {
  const file = fs
    .readdirSync(dataDir, { recursive: true })
    .map(String)
    .find(name => path.basename(name) === 'syncLog');
  if (!file) {
    return [];
  }
  const stored = JSON.parse(
    fs.readFileSync(path.join(dataDir, file), 'utf8'),
  ) as { state: { runs: SyncRun[] } };
  return stored.state.runs;
};

test('keeps running in the tray, and comes back from it', async ({
  window,
  main,
  login,
}) => {
  await login();
  await expect
    .poll(() => main.trayLabels())
    .toEqual([
      expect.stringMatching(exact('T_trayOpen')),
      expect.stringMatching(exact('T_refresh')),
      '',
      expect.stringMatching(exact('T_trayQuit')),
    ]);

  await main.closeWindow();
  await expect.poll(() => main.windowVisible()).toBe(false);
  await main.chooseTrayItem(exact('T_trayOpen'));
  await expect.poll(() => main.windowVisible()).toBe(true);
  await expect(byId(window, 'today')).toBeVisible();
});

test('syncs in the background from the tray’s Refresh', async ({
  main,
  dataDir,
  login,
}) => {
  await login();
  await main.closeWindow();
  await expect.poll(() => main.windowVisible()).toBe(false);

  // The timer's first run is 15 minutes away: this one is Refresh's.
  expect(syncRuns(dataDir)).toEqual([]);
  await main.chooseTrayItem(exact('T_refresh'));
  await expect
    .poll(() => syncRuns(dataDir).length, { timeout: 30_000 })
    .toBe(1);
  const [run] = syncRuns(dataDir);
  expect(run.status).toBe('synced');
  for (const { fetched, total } of Object.values(run.courses ?? {})) {
    expect(fetched).toBe(total);
  }
  // The window stays in the tray.
  expect(await main.windowVisible()).toBe(false);
});

test('skips the background sync after logging out', async ({
  window,
  main,
  dataDir,
  login,
}) => {
  await login();
  await byId(window, 'tab-settings').click();
  await byId(window, 'settings-logout').click();
  await window.getByRole('button', { name: exact('T_logout') }).click();
  await expect(byId(window, 'login-username')).toBeVisible();

  await main.chooseTrayItem(exact('T_refresh'));
  await expect
    .poll(() => syncRuns(dataDir).map(run => run.status), { timeout: 30_000 })
    .toEqual(['skipped']);
});

test('quits from the tray', async ({ app, main, login }) => {
  await login();
  const closed = app.waitForEvent('close');
  await main.chooseTrayItem(exact('T_trayQuit')).catch(() => {
    // The app can quit before the call returns.
  });
  await closed;
});
