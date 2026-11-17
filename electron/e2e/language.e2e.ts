// The app's language follows the system's (`--lang` here), as the Maestro
// flows run in English on the local devices and in Chinese on CI: the mock
// data, the screens, dialogs and the tray menu all switch with it.
import { expect, packagedApp, test } from './fixtures';
import { exact } from './maestroEnv';
import { byId, card, openCard, openSettings, openTab, shown } from './steps';

test.describe('in Chinese', () => {
  test.use({ language: 'zh-CN' });

  test('logs in, visits the tabs and logs out', async ({
    window,
    main,
    login,
  }) => {
    await login();
    // The texts are the Chinese halves of the flows' values.
    const chinese = (key: string) =>
      new RegExp(exact(key).source.replace(/^\^\(.*?\|/, '^('));
    await expect(
      window.getByRole('tab', { name: chinese('T_notices') }),
    ).toBeVisible();
    await openTab(window, 'notices');
    await expect(card(window, 'MOCK_NOTICE')).toContainText(/\p{Script=Han}/u);
    // Chromium draws the gap between Chinese and Latin text (index.web.js),
    // dialogs and menus in their portals too.
    expect(
      await window.evaluate(() =>
        getComputedStyle(document.body).getPropertyValue('text-autospace'),
      ),
    ).toBe('normal');
    await openCard(window, 'MOCK_NOTICE', 'notice-detail');
    await openTab(window, 'courses');
    await expect(card(window, 'MOCK_COURSE')).toBeVisible();

    // Only a dev run lets the test reach the tray's menu.
    if (!packagedApp) {
      await expect
        .poll(async () => (await main.trayLabels())[0])
        .toMatch(chinese('T_trayOpen'));
      expect((await main.trayLabels())[1]).toMatch(
        chinese('T_trayCheckForNewItems'),
      );
    }

    await openSettings(window);
    await byId(window, 'settings-logout').click();
    await window.getByRole('button', { name: chinese('T_logout') }).click();
    await expect(byId(window, 'login-username')).toBeVisible();
    await expect(
      shown(window.getByRole('button', { name: chinese('T_login') })),
    ).toBeVisible();
  });
});
