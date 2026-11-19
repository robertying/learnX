// .maestro/13-settings-logout.yaml: opens the Changelog and About from
// Settings, then logs out (confirmed in a dialog) back to the login page,
// which the next launch shows too.
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from './fixtures.ts';
import { exact } from './maestroEnv.ts';
import { backToSettings, byId, openSettings, shown } from './steps.ts';

test('opens settings pages and logs out', async ({
  app,
  window,
  dataDir,
  login,
  relaunch,
}) => {
  await login();
  await openSettings(window);

  await byId(window, 'settings-changelog').click();
  await expect(
    shown(window.getByRole('heading', { name: exact('T_changelog') })),
  ).toBeVisible();
  await backToSettings(window);
  await byId(window, 'settings-about').click();
  await expect(shown(window.getByText(/© \d+ Rui Ying/))).toBeVisible();
  await backToSettings(window);
  // The window is named after Settings until logging out.
  const windowTitle = () =>
    app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].title);
  await expect.poll(windowTitle).toMatch(/. - learnX$/);

  await byId(window, 'settings-logout').click();
  await window.getByRole('button', { name: exact('T_logout') }).click();
  await expect(byId(window, 'login-username')).toBeVisible();
  // Named learnX again, not after Settings.
  await expect.poll(windowTitle).toBe('learnX');

  // The saved login is gone: the next launch asks again.
  await expect
    .poll(() =>
      fs.existsSync(path.join(dataDir, 'userData', 'secrets', 'credentials')),
    )
    .toBe(false);
  const relaunched = await relaunch();
  await expect(byId(relaunched.window, 'login-username')).toBeVisible();
});

test('leaves the login page in the accessibility tree after logging out', async ({
  window,
  login,
}) => {
  // The confirmation hides the page from assistive technology while it's
  // open, and must give it back though logging out replaced what was under
  // it (web/FluentRoot).
  await login();
  await openSettings(window);
  await byId(window, 'settings-logout').click();
  await expect(window.locator('#root')).toHaveAttribute('aria-hidden', 'true');
  await window.getByRole('button', { name: exact('T_logout') }).click();
  await expect(window.locator('#root')).not.toHaveAttribute(
    'aria-hidden',
    'true',
  );
  await expect(
    window.getByRole('textbox', { name: exact('T_usernameOrId') }),
  ).toBeVisible();
  await expect(
    window.getByRole('button', { name: exact('T_login') }),
  ).toBeVisible();
});
