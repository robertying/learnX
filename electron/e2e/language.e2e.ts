// The app's language follows the system's (`--lang` here), as the Maestro
// flows run in English on the local devices and in Chinese on CI: the mock
// data, the screens, dialogs and the tray menu all switch with it.
import { expect, test } from './fixtures';
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
    await openCard(window, 'MOCK_NOTICE', 'notice-detail');
    await openTab(window, 'courses');
    await expect(card(window, 'MOCK_COURSE')).toBeVisible();

    await expect
      .poll(async () => (await main.trayLabels())[0])
      .toMatch(chinese('T_trayOpen'));

    await openSettings(window);
    await byId(window, 'settings-logout').click();
    await window.getByRole('button', { name: chinese('T_logout') }).click();
    await expect(byId(window, 'login-username')).toBeVisible();
    // By its text: the login page is left out of the accessibility tree
    // after logging out (logout.e2e.ts).
    await expect(shown(window.getByText(chinese('T_login')))).toBeVisible();
  });
});
