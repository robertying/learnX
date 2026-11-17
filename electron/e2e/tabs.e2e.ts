// .maestro/04-tabs.yaml: a new install logs in with the mock account, opens
// on Today and visits every tab, a course among them.
import { expect, test } from './fixtures';
import { text } from './maestroEnv';
import { byId, card, openCard, openSettings, openTab, shown } from './steps';

test('logs in and visits every tab', async ({ window, main, login }) => {
  await login();
  await expect(byId(window, 'today')).toBeVisible();
  await expect(shown(window.getByText(text('T_todayDueSoon')))).toBeVisible();

  const tabs = [
    ['notices', 'MOCK_NOTICE'],
    ['assignments', 'MOCK_ASSIGNMENT'],
    ['files', 'MOCK_FILE'],
    ['courses', 'MOCK_COURSE'],
  ] as const;
  for (const [tab, item] of tabs) {
    await openTab(window, tab);
    await expect(card(window, item)).toBeVisible();
  }
  await openCard(window, 'MOCK_COURSE', 'course-detail');

  await openSettings(window);
  await expect(byId(window, 'settings-logout')).toBeVisible();
  await openTab(window, 'notices');
  await expect(card(window, 'MOCK_NOTICE')).toBeVisible();

  // Nothing reached the system on the way.
  const record = await main.record();
  expect(record.openedUrls).toEqual([]);
  expect(record.notifications).toEqual([]);
});
