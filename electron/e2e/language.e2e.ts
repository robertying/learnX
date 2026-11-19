// The app's language follows the system's (`--lang` here), as the Maestro
// flows run in English on the local devices and in Chinese on CI: the mock
// data, the screens, dialogs and the tray menu all switch with it. On
// Windows and Linux, Settings › Language chooses one for learnX itself.
import fs from 'node:fs';
import path from 'node:path';
import { expect, packagedApp, test } from './fixtures.ts';
import type { Running } from './fixtures.ts';
import { exact, text } from './maestroEnv.ts';
import {
  byId,
  card,
  openCard,
  openSettings,
  openSettingsPage,
  openTab,
  shown,
} from './steps.ts';

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
    // Windows and Linux draw no gap between Chinese and Latin text in the
    // tray's menu, so it's typed in there (web/systemText); macOS draws it.
    if (!packagedApp) {
      const gapped = /\p{Script=Han}\u2005[A-Za-z]/u;
      await expect
        .poll(async () => (await main.trayLabels())[0].replaceAll('\u2005', ''))
        .toMatch(chinese('T_trayOpen'));
      const [open, checkForNewItems] = await main.trayLabels();
      expect(gapped.test(open)).toBe(process.platform !== 'darwin');
      expect(checkForNewItems).toMatch(chinese('T_trayCheckForNewItems'));
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

test.describe('chosen in Settings', () => {
  // A Mac has a per-app language of its own: a dev run there offers the
  // setting only when asked (electron/language.ts).
  const env = { LEARNX_LANGUAGE_SETTING: '1' };
  test.use({ appLaunch: { env } });

  /** Chooses a language and answers the restart question. */
  const choose = async (
    { app, window }: Pick<Running, 'app' | 'window'>,
    language: string,
    restart: boolean,
  ) => {
    await openSettings(window);
    await openSettingsPage(window, 'settings-language', 'language-settings');
    await byId(window, `language-${language}`).click();
    await expect(
      window.getByText(text('T_languageRestartTitle')),
    ).toBeVisible();
    if (!restart) {
      await window.getByRole('button', { name: exact('T_later') }).click();
      return;
    }
    const userData = await app.evaluate(({ app: electronApp }) =>
      electronApp.getPath('userData'),
    );
    const closed = app.waitForEvent('close');
    await window
      .getByRole('button', { name: exact('T_restartNow') })
      .click()
      .catch(() => {
        // The app can quit before the click returns.
      });
    // learnX quits and asks to be started again (the stand-in notes it).
    await closed;
    expect(fs.existsSync(path.join(userData, 'e2e-relaunched'))).toBe(true);
  };

  test('switches to Chinese at the next launch, and back to the system’s', async ({
    app,
    window,
    login,
    relaunch,
  }) => {
    // Launched in English (`--lang=en-US`), as the system's language.
    await login();
    await expect(window.getByRole('tab', { name: /^Notices$/ })).toBeVisible();
    await choose({ app, window }, 'zh-CN', true);

    // The choice wins over the system's language.
    const chinese = await relaunch({ env });
    await expect(
      chinese.window.getByRole('tab', { name: /^公告$/ }),
    ).toBeVisible();
    await openSettings(chinese.window);
    await openSettingsPage(
      chinese.window,
      'settings-language',
      'language-settings',
    );
    await expect(byId(chinese.window, 'language-zh-CN')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    // Asked in the language in use, and kept for later.
    await choose(chinese, 'system', false);
    await expect(byId(chinese.window, 'language-system')).toHaveAttribute(
      'aria-checked',
      'true',
    );

    const english = await relaunch({ env });
    await expect(
      english.window.getByRole('tab', { name: /^Notices$/ }),
    ).toBeVisible();
  });
});
