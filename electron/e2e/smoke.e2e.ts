// The smoke test: a new install logs in with the mock account, opens on
// Today and opens each tab, as .maestro/04-tabs.yaml does on mobile.
import { expect, test } from './fixtures';
import { text } from './maestroEnv';

test('logs in with the mock account and opens every tab', async ({
  window,
  main,
  login,
}) => {
  await login();
  await expect(window.getByTestId('today')).toBeVisible();
  await expect(
    window.getByText(text('T_todayDueSoon')).filter({ visible: true }).first(),
  ).toBeVisible();

  const tabs = [
    ['tab-notices', 'MOCK_NOTICE'],
    ['tab-assignments', 'MOCK_ASSIGNMENT'],
    ['tab-files', 'MOCK_FILE'],
    ['tab-courses', 'MOCK_COURSE'],
  ] as const;
  for (const [tab, item] of tabs) {
    await window.getByTestId(tab).click();
    // Tabs stay mounted when hidden, so only what shows counts.
    await expect(
      window.getByText(text(item)).filter({ visible: true }).first(),
    ).toBeVisible();
  }
  await window.getByTestId('tab-settings').click();
  await expect(window.getByTestId('settings-list')).toBeVisible();
  await window.getByTestId('tab-today').click();
  await expect(window.getByTestId('today')).toBeVisible();

  // Nothing reached the system on the way.
  const record = await main.record();
  expect(record.openedUrls).toEqual([]);
  expect(record.notifications).toEqual([]);
});
