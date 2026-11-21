// Notifications in the Electron app: Settings' deadline reminders schedule
// in the main process (notifications.ts), and a click on one shows the
// window and opens its assignment, from the tray too. A dev run never posts
// a system notification: it logs it, and the page shows it as a toast
// (system.ts), which the test reads back and clicks through the same path.
import type { Page } from '@playwright/test';
import { expect, packagedApp, test } from './fixtures.ts';
import { exact, text } from './maestroEnv.ts';
import {
  byId,
  openSettings,
  openSettingsPage,
  openTab,
  shown,
  toggle,
} from './steps.ts';

test.skip(
  !!packagedApp,
  'a packaged app posts system notifications, which only a dev run logs',
);

interface Scheduled {
  identifier: string;
  content: { title?: string; body?: string; data?: Record<string, unknown> };
  trigger: { type: 'date'; value: number };
}

/** The reminders waiting in the main process, as the page lists them. */
const scheduled = (window: Page) =>
  window.evaluate(
    () =>
      (
        window as unknown as {
          learnx: { notifications: { list: () => Promise<Scheduled[]> } };
        }
      ).learnx.notifications.list() as Promise<Scheduled[]>,
  );

/** Shows a scheduled reminder now, as its time coming would. */
const fireNow = (window: Page, reminder: Scheduled) =>
  window.evaluate(
    ({ identifier, content }) =>
      (
        window as unknown as {
          learnx: {
            notifications: { schedule: (request: unknown) => Promise<string> };
          };
        }
      ).learnx.notifications.schedule({ identifier, content, trigger: null }),
    reminder,
  );

test('reminds of a deadline and opens the assignment from it', async ({
  window,
  main,
  login,
}) => {
  await login();
  await openSettings(window);
  await openSettingsPage(
    window,
    'settings-notifications',
    'notification-settings',
  );
  await toggle(window, 'notifications-deadlineReminders', true);

  // A reminder for each unfinished assignment due later, in the future.
  await expect
    .poll(async () => (await scheduled(window)).length)
    .toBeGreaterThan(0);
  const reminders = await scheduled(window);
  const reminder = reminders.find(r =>
    text('MOCK_ASSIGNMENT').test(r.content.body ?? ''),
  );
  expect(reminder, JSON.stringify(reminders)).toBeDefined();
  expect(reminder!.trigger.value).toBeGreaterThan(Date.now());
  expect(reminder!.content.data).toMatchObject({ type: 'assignment' });

  // Its time comes while the window is hidden (closed to the tray).
  await openTab(window, 'notices');
  await main.hideWindow();
  await expect.poll(() => main.windowVisible()).toBe(false);
  await fireNow(window, reminder!);
  await expect
    .poll(async () => (await main.shownNotifications()).length)
    .toBe(1);
  const [shownReminder] = await main.shownNotifications();
  expect(shownReminder.title).toMatch(exact('T_notifyDeadlineReminder'));
  expect(shownReminder.body).toMatch(text('MOCK_ASSIGNMENT'));

  await main.clickNotification();
  await expect.poll(() => main.windowVisible()).toBe(true);
  await expect(byId(window, 'assignment-detail')).toBeVisible();
  await expect(
    byId(window, 'assignment-detail').getByRole('heading', {
      name: text('MOCK_ASSIGNMENT'),
    }),
  ).toBeVisible();

  // Turning reminders off takes them back.
  await openSettings(window);
  await openSettingsPage(
    window,
    'settings-notifications',
    'notification-settings',
  );
  await toggle(window, 'notifications-deadlineReminders', false);
  await expect.poll(async () => (await scheduled(window)).length).toBe(0);
});

test('shows a dev run’s notification as a toast', async ({ window, login }) => {
  await login();
  await fireNow(window, {
    identifier: 'e2e',
    content: { title: 'learnX E2E', body: 'A notification' },
    trigger: { type: 'date', value: 0 },
  });
  await expect(
    shown(window.getByTestId('toast').getByText(/learnX E2E/)),
  ).toBeVisible();
});
