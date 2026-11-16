// The main-process stand-ins (mainProcess.ts) that ported flows rely on: a
// card's native context menu, chosen from the test, and links that would
// open in the browser.
import { expect, test } from './fixtures';
import { text } from './maestroEnv';

test('chooses from a card’s native context menu', async ({
  window,
  main,
  login,
}) => {
  await login();
  await window.getByTestId('tab-notices').click();
  const card = window
    .getByText(text('MOCK_NOTICE'))
    .filter({ visible: true })
    .first();
  await card.click({ button: 'right' });
  await expect
    .poll(async () => (await main.record()).menus.at(-1)?.labels ?? [])
    .toContain('Favorite');
  await main.chooseMenuItem('Favorite');
  await card.click({ button: 'right' });
  await expect
    .poll(async () => (await main.record()).menus.at(-1)?.labels ?? [])
    .toContain('Unfavorite');
});

test('records links instead of opening the browser', async ({
  window,
  main,
  login,
}) => {
  await login();
  await window.getByTestId('tab-settings').click();
  await window.getByText('About', { exact: true }).click();
  await window.getByText('Source Code', { exact: true }).click();
  await expect
    .poll(async () => (await main.record()).openedUrls)
    .toEqual(['https://github.com/robertying/learnX']);
});
