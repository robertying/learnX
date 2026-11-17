// .maestro/10-errors.yaml: failures, each after a mock login and a relaunch
// with the failure's launch option (services/launchOptions.ts), as the flow's
// `launchApp` does. No results is in search.e2e.ts.
import { expect, packagedApp, test } from './fixtures';
import { exact, text } from './maestroEnv';
import { byId, openCard, openTab, shown } from './steps';

test.skip(!!packagedApp, 'a packaged app takes no launch options');

test('shows the offline status and a file that can’t download', async ({
  login,
  relaunch,
}) => {
  await login();
  const { window } = await relaunch({
    launchOptions: { mockLatency: 'none', mockFailure: 'offline' },
  });
  await expect(
    shown(window.getByText(text('T_syncStatusOffline'))),
  ).toBeVisible({ timeout: 30_000 });
  await openTab(window, 'files');
  await openCard(window, 'MOCK_FILE', 'file-detail');
  await expect(byId(window, 'file-error')).toBeVisible({ timeout: 30_000 });
  await shown(
    window.getByRole('button', { name: exact('T_tryAgain') }),
  ).click();
  await expect(byId(window, 'file-error')).toBeVisible({ timeout: 30_000 });
});

test('offers to log in again after a server error', async ({
  login,
  relaunch,
}) => {
  await login();
  const { window } = await relaunch({
    launchOptions: { mockLatency: 'none', mockFailure: 'serverError' },
  });
  await expect(
    shown(window.getByText(text('T_syncStatusLoginFailed'))),
  ).toBeVisible({ timeout: 30_000 });
  await expect(byId(window, 'sync-status-relogin')).toBeVisible();
});

test('goes offline after a timeout, then reconnects', async ({
  login,
  relaunch,
}) => {
  // The mock server answers after 20 s, and the quiet retry comes 30 s later.
  test.setTimeout(180_000);
  await login();
  const { window } = await relaunch({
    launchOptions: { mockLatency: 'none', mockFailure: 'timeout' },
  });
  await expect(
    shown(window.getByText(text('T_syncStatusOffline'))),
  ).toBeVisible({ timeout: 40_000 });
  await expect(
    shown(window.getByText(text('T_syncStatusReconnecting'))),
  ).toBeVisible({ timeout: 75_000 });
});

test('offers to log in again after the password changed', async ({
  login,
  relaunch,
}) => {
  await login();
  const { window } = await relaunch({
    launchOptions: {
      mockLatency: 'none',
      mockFailure: 'none',
      mockSessionExpiry: 'passwordChanged',
    },
  });
  await expect(byId(window, 'sync-status-relogin')).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    shown(window.getByText(text('T_syncStatusLoginFailed'))),
  ).toBeVisible();
});

test('logs in again after rejected logins', async ({ login, relaunch }) => {
  await login();
  const { window } = await relaunch({
    launchOptions: {
      mockLatency: 'none',
      mockFailure: 'none',
      mockLoginFails: '2',
    },
  });
  const relogin = byId(window, 'sync-status-relogin');
  const retry = shown(
    window.getByRole('button', { name: exact('T_retryLogin') }),
  );
  await expect(relogin).toBeVisible({ timeout: 30_000 });
  await expect(
    shown(window.getByText(text('T_syncStatusLoginFailed'))),
  ).toBeVisible();

  // The second login is rejected too. The web build isn't an E2E build
  // (TEST_LOGIN), so its toast leaves out the reason the flow matches.
  await relogin.click();
  await expect(byId(window, 'login-username')).toBeVisible();
  await retry.click();
  await expect(
    shown(window.getByTestId('toast').getByText(text('T_loginFailed'))),
  ).toBeVisible({ timeout: 30_000 });
  await expect(byId(window, 'login-username')).toBeVisible();

  // Offline, then the third login goes through.
  await shown(
    window.getByRole('button', { name: exact('T_offlineMode') }),
  ).click();
  await expect(relogin).toBeVisible();
  await relogin.click();
  await retry.click();
  await expect(window.getByTestId('tab-notices')).toBeVisible({
    timeout: 30_000,
  });
  await expect(byId(window, 'login-username')).toBeHidden();
  await expect(relogin).toBeHidden();
});
