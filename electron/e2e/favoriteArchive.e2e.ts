// .maestro/05-favorite-archive.yaml: favorites and archives a notice from its
// context menu (a native menu here) and puts it back, filtering the list each
// time. Cards don't swipe on the desktop: the buttons that show while the
// pointer is on a card stand in for iOS's swipe actions.
import { expect, test } from './fixtures.ts';
import { exact } from './maestroEnv.ts';
import { card, cardAction, filter, openTab } from './steps.ts';

test('favorites and archives a notice from its context menu', async ({
  window,
  main,
  login,
}) => {
  await login();
  await openTab(window, 'notices');

  await cardAction(window, main, 'MOCK_NOTICE', 'T_favorite');
  await filter(window, 'T_fav');
  await expect(card(window, 'MOCK_NOTICE')).toBeVisible();

  await cardAction(window, main, 'MOCK_NOTICE', 'T_unfavorite');
  await expect(card(window, 'MOCK_NOTICE')).toBeHidden();

  await filter(window, 'T_all');
  await cardAction(window, main, 'MOCK_NOTICE', 'T_archive');
  await expect(card(window, 'MOCK_NOTICE')).toBeHidden();
  await filter(window, 'T_archived');
  await expect(card(window, 'MOCK_NOTICE')).toBeVisible();

  await cardAction(window, main, 'MOCK_NOTICE', 'T_restore');
  await filter(window, 'T_all');
  await expect(card(window, 'MOCK_NOTICE')).toBeVisible();
});

test('favorites and archives a notice from its hover buttons', async ({
  window,
  login,
}) => {
  await login();
  await openTab(window, 'notices');
  /** A button the card shows while the pointer is on it. */
  const hoverButton = async (action: string) => {
    await card(window, 'MOCK_NOTICE').hover();
    await window
      .getByRole('button', { name: exact(action) })
      .filter({ visible: true })
      .first()
      .click();
  };

  await hoverButton('T_favorite');
  await filter(window, 'T_fav');
  await expect(card(window, 'MOCK_NOTICE')).toBeVisible();
  await hoverButton('T_unfavorite');
  await expect(card(window, 'MOCK_NOTICE')).toBeHidden();

  await filter(window, 'T_all');
  await hoverButton('T_archive');
  await expect(card(window, 'MOCK_NOTICE')).toBeHidden();
  await filter(window, 'T_archived');
  await hoverButton('T_restore');
  await expect(card(window, 'MOCK_NOTICE')).toBeHidden();
  await filter(window, 'T_all');
  await expect(card(window, 'MOCK_NOTICE')).toBeVisible();
});
