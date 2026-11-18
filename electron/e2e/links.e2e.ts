// .maestro/11-links.yaml: opening screens from outside the app. The Electron
// app registers no learnx:// links; Windows' Jump List opens Today and the
// Schedule instead (`--learnx-open=`), in the launch it starts or, through
// the single instance, in the learnX already running. Links in the app open
// in the browser.
import { expect, test } from './fixtures.ts';
import { exact } from './maestroEnv.ts';
import { byId, openSettings, openTab, shown } from './steps.ts';

test('opens the Schedule and Today from the Jump List', async ({
  login,
  relaunch,
}) => {
  await login();
  const { window, main } = await relaunch({
    args: ['--learnx-open=schedule'],
  });
  await expect(byId(window, 'schedule')).toBeVisible();

  // A second launch hands its task to this one.
  await openTab(window, 'notices');
  await main.secondLaunch(['--learnx-open=today']);
  await expect(byId(window, 'today')).toBeVisible();
  await main.secondLaunch(['--learnx-open=schedule']);
  await expect(byId(window, 'schedule')).toBeVisible();
  // Anything else only shows the window.
  await main.secondLaunch(['--learnx-open=settings']);
  await expect(byId(window, 'schedule')).toBeVisible();
});

test('opens links in the browser', async ({ window, main, login }) => {
  await login();
  await openSettings(window);
  await byId(window, 'settings-about').click();
  await shown(window.getByText(exact('T_sourceCode'))).click();
  await expect
    .poll(async () => (await main.record()).openedUrls)
    .toEqual(['https://github.com/robertying/learnX']);
});
