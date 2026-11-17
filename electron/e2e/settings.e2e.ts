// .maestro/08-settings.yaml: changes every setting and puts it back. The
// Electron app asks for no notification permission, so every notification
// switch runs, as on Android. Its Calendar page only exports an .ics file
// (calendarExport.e2e.ts) and it has no Swipe Actions; Start at Login is its
// own, and never reaches the system here (mainProcess.ts).
import { expect, test } from './fixtures';
import { text } from './maestroEnv';
import {
  backToSettings,
  byId,
  openSettings,
  openSettingsPage,
  shown,
  toggle,
  toggleOf,
} from './steps';

test('changes every setting', async ({ window, login }) => {
  await login();
  await openSettings(window);

  await toggle(window, 'settings-graduate', true);
  await toggle(window, 'settings-graduate', false);

  // Another semester, then the current one again.
  await openSettingsPage(window, 'settings-semester', 'semester-selection');
  const semesters = byId(window, 'semester-selection').locator(
    '[data-testid^="semester-"]',
  );
  const current = semesters.and(window.locator('[aria-checked="true"]'));
  const currentId = await current.getAttribute('data-testid');
  const other = semesters.and(window.locator('[aria-checked="false"]')).first();
  const otherId = await other.getAttribute('data-testid');
  await other.click();
  await expect(window.getByTestId(otherId!)).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await window.getByTestId(currentId!).click();
  await expect(window.getByTestId(currentId!)).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await backToSettings(window);

  await openSettingsPage(
    window,
    'settings-notifications',
    'notification-settings',
  );
  const notifications = [
    'notices',
    'assignments',
    'files',
    'classReminders',
    'deadlineReminders',
    'grades',
    'deadlineChanges',
    'groupSubmissions',
  ];
  for (const key of notifications) {
    await toggle(window, `notifications-${key}`, true);
    if (key === 'classReminders') {
      await expect(
        shown(window.getByText(text('T_classReminderOffset'))),
      ).toBeVisible();
    }
    if (key === 'deadlineReminders') {
      await expect(
        shown(window.getByText(text('T_deadlineReminderOffset'))),
      ).toBeVisible();
    }
  }
  for (const key of notifications.toReversed()) {
    await toggle(window, `notifications-${key}`, false);
  }
  await backToSettings(window);

  await openSettingsPage(
    window,
    'settings-course-sharing',
    'course-information-sharing',
  );
  await toggle(window, 'course-sharing-toggle', true, 'T_join');
  await toggle(window, 'course-sharing-toggle', false);
  await backToSettings(window);
});

test('turns Start at Login on and off without a dev run registering it', async ({
  app,
  window,
  main,
  login,
}) => {
  test.skip(
    process.platform === 'linux',
    'Electron has no Start at login on Linux, so Settings has no switch',
  );
  await login();
  await openSettings(window);
  // A dev run never changes it: the switch goes back off.
  await toggleOf(window, 'settings-start-at-login').click();
  await expect(toggleOf(window, 'settings-start-at-login')).not.toBeChecked();
  expect((await main.record()).loginItems).toEqual([]);
  expect(
    await app.evaluate(
      ({ app: electronApp }) => electronApp.getLoginItemSettings().openAtLogin,
    ),
  ).toBe(false);
});

test.describe('where the system takes Start at Login', () => {
  // A packaged app's path: setLoginItemSettings, recorded by the stand-in.
  test.use({ appLaunch: { env: { LEARNX_ALLOW_LOGIN_ITEM: '1' } } });

  test('turns it on and off', async ({ window, main, login }) => {
    test.skip(process.platform === 'linux', 'no Start at login on Linux');
    await login();
    await openSettings(window);
    await toggle(window, 'settings-start-at-login', true);
    await toggle(window, 'settings-start-at-login', false);
    expect((await main.record()).loginItems).toEqual(
      process.platform === 'win32'
        ? [
            { openAtLogin: true, args: ['--hidden'] },
            { openAtLogin: false, args: ['--hidden'] },
          ]
        : [{ openAtLogin: true }, { openAtLogin: false }],
    );
  });
});
