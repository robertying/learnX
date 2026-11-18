// .maestro/07-screens.yaml: opens every other screen: the Schedule, the
// submission page, courseX's course information and every Settings page.
// Swipe Actions isn't in the Electron app's Settings (cards don't swipe).
import { expect, test } from './fixtures.ts';
import { exact } from './maestroEnv.ts';
import {
  backToSettings,
  byId,
  goBack,
  openCard,
  openSettings,
  openSettingsPage,
  openTab,
  shown,
} from './steps.ts';

test('opens every other screen', async ({ window, login }) => {
  await login();

  await byId(window, 'today-schedule').click();
  await expect(byId(window, 'schedule')).toBeVisible();

  await openTab(window, 'assignments');
  await openCard(window, 'MOCK_ASSIGNMENT', 'assignment-detail');
  await shown(window.getByRole('button', { name: exact('T_submit') })).click();
  await expect(byId(window, 'assignmentSubmission')).toBeVisible();
  await expect(byId(window, 'pickAttachment')).toBeVisible();
  await goBack(window);
  await expect(byId(window, 'assignmentSubmission')).toBeHidden();

  await openTab(window, 'courses');
  await openCard(window, 'MOCK_COURSE', 'course-detail');
  await shown(
    window.getByRole('button', { name: exact('T_courseInformation') }),
  ).click();
  await expect(byId(window, 'courseXReload')).toBeVisible();
  await goBack(window);
  await expect(byId(window, 'courseXReload')).toBeHidden();

  await openSettings(window);
  for (const [row, page] of [
    ['settings-semester', 'semester-selection'],
    ['settings-notifications', 'notification-settings'],
    ['settings-calendar', 'calendar-settings'],
    ['settings-downloads', 'downloads'],
    ['settings-course-sharing', 'course-information-sharing'],
    ['settings-maintainer', 'maintainer'],
    ['settings-help', 'help'],
  ] as const) {
    await openSettingsPage(window, row, page);
    await backToSettings(window);
  }
  await byId(window, 'settings-whats-new').click();
  await expect(byId(window, 'whats-new')).toBeVisible();
  await byId(window, 'whats-new-continue').click();
  await expect(byId(window, 'whats-new')).toBeHidden();
  await expect(byId(window, 'settings-list')).toBeVisible();
});
