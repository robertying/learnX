// .maestro/06-search.yaml: searches, switches the result tabs, leaves out
// archived items with the filter menu and opens a result.
import { expect, test } from './fixtures.ts';
import { exact, maestroEnv, text } from './maestroEnv.ts';
import { byId, card, openMenu, openTab, search, shown } from './steps.ts';

test('searches and opens a result', async ({ window, login }) => {
  await login();
  await openTab(window, 'notices');
  await search(window, maestroEnv().MOCK_SEARCH_TERM);
  await expect(card(window, 'MOCK_SEARCH_NOTICE')).toBeVisible();
  await expect(card(window, 'MOCK_SEARCH_ASSIGNMENT')).toBeVisible();

  const tabs = byId(window, 'search-tabs');
  await tabs.getByRole('tab', { name: exact('T_assignments') }).click();
  await expect(card(window, 'MOCK_SEARCH_NOTICE')).toBeHidden();
  await expect(card(window, 'MOCK_SEARCH_ASSIGNMENT')).toBeVisible();
  await tabs.getByRole('tab', { name: exact('T_files') }).click();
  await expect(card(window, 'MOCK_SEARCH_ASSIGNMENT')).toBeHidden();
  await expect(byId(window, 'file-card')).toBeVisible();
  await tabs.getByRole('tab', { name: exact('T_all') }).click();
  await expect(card(window, 'MOCK_SEARCH_NOTICE')).toBeVisible();

  // Archived items are in by default: leaving them out and back in keeps
  // the notice, which isn't archived.
  const filterMenu = shown(
    window.getByRole('button', { name: exact('T_filter') }),
  );
  const archived = window.getByRole('menuitemcheckbox', {
    name: text('T_archived'),
  });
  await openMenu(window, filterMenu);
  await archived.click();
  await window.keyboard.press('Escape');
  await expect(card(window, 'MOCK_SEARCH_NOTICE')).toBeVisible();
  await openMenu(window, filterMenu);
  await expect(archived).toHaveAttribute('aria-checked', 'false');
  await archived.click();
  await window.keyboard.press('Escape');

  await card(window, 'MOCK_SEARCH_NOTICE').click();
  await expect(byId(window, 'notice-detail')).toBeVisible();
});

test('shows no results', async ({ window, login }) => {
  await login();
  await search(window, 'zzzqqq');
  await expect(shown(window.getByText(exact('T_noResults')))).toBeVisible();
  await expect(
    shown(window.getByText(exact('T_noResultsDescription'))),
  ).toBeVisible();
});
