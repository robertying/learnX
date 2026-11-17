// The Maestro flows' subflows (.maestro/subflows) for the Electron app: the
// same steps by the same test IDs and texts. The window is wide enough for
// the split views, so a detail opens beside its list and there's no back.
import type { Locator, Page } from '@playwright/test';
import { expect } from './fixtures';
import { exact, text } from './maestroEnv';

/**
 * The first of these that shows: tabs and split panes stay mounted when
 * hidden, so only what's on screen counts.
 */
export const shown = (locator: Locator) =>
  locator.filter({ visible: true }).first();

/** An element by its testID, where it shows. */
export const byId = (window: Page, id: string) => shown(window.getByTestId(id));

export type Tab =
  | 'today'
  | 'notices'
  | 'assignments'
  | 'files'
  | 'courses'
  | 'settings';

/** subflows/tab.yaml: a tab of the navigation pane. */
export const openTab = async (window: Page, tab: Tab) => {
  await window.getByTestId(`tab-${tab}`).click();
  await expect(window.getByTestId(`tab-${tab}`)).toHaveAttribute(
    'aria-selected',
    'true',
  );
};

/** A card by a mock item's text (`MOCK_NOTICE`), where it shows. */
export const card = (window: Page, mock: string) =>
  shown(window.getByRole('button', { name: text(mock) }));

/** subflows/open.yaml: opens a card and waits for its detail. */
export const openCard = async (window: Page, mock: string, detail: string) => {
  await card(window, mock).click();
  await expect(byId(window, detail)).toBeVisible();
};

/**
 * subflows/card-actions.yaml: chooses a card's action from its context menu,
 * the native menu a right-click shows (recorded by the main process's
 * stand-in, which clicks the item).
 */
export const cardAction = async (
  window: Page,
  main: {
    record: () => Promise<{ menus: { labels: string[] }[] }>;
    chooseMenuItem: (label: RegExp) => Promise<void>;
  },
  mock: string,
  action: string,
) => {
  const shownMenus = (await main.record()).menus.length;
  await card(window, mock).click({ button: 'right' });
  await expect
    .poll(async () => (await main.record()).menus.length)
    .toBeGreaterThan(shownMenus);
  await main.chooseMenuItem(exact(action));
};

/** subflows/filter.yaml: a choice of the list's Filter menu. */
export const filter = async (window: Page, choice: string) => {
  await shown(window.getByRole('button', { name: exact('T_filter') })).click();
  await window
    .getByRole('menuitemradio', { name: new RegExp(text(choice).source) })
    .click();
};

/** subflows/settings.yaml: the Settings tab. */
export const openSettings = async (window: Page) => {
  await openTab(window, 'settings');
  await expect(byId(window, 'settings-list')).toBeVisible();
};

/** subflows/settings-page.yaml: a Settings row and the page it opens. */
export const openSettingsPage = async (
  window: Page,
  row: string,
  page: string,
) => {
  await byId(window, row).click();
  await expect(byId(window, page)).toBeVisible();
};

/**
 * subflows/back.yaml and close.yaml: the detail pane's back link (React
 * Navigation's, named after the screen it goes back to), which also closes
 * what opens as a sheet on the phone (the submission page, courseX).
 */
export const goBack = async (window: Page) => {
  await shown(window.getByRole('link', { name: /, back$/ })).click();
};

/**
 * subflows/back-to-settings.yaml: back to the Settings list, where a page
 * covers it (a narrow window); a wide one shows pages beside it.
 */
export const backToSettings = async (window: Page) => {
  if (!(await byId(window, 'settings-list').isVisible())) {
    await goBack(window);
  }
  await expect(byId(window, 'settings-list')).toBeVisible();
};

/** The switch of a toggle row by its testID. */
export const toggleOf = (window: Page, id: string) =>
  byId(window, id)
    .getByRole('switch')
    .or(window.locator(`[data-testid="${id}"][role="switch"]`))
    .first();

/**
 * subflows/toggle.yaml: flips a toggle row by its testID and checks its new
 * state, after `confirm` (a dialog's button) if one asks.
 */
export const toggle = async (
  window: Page,
  id: string,
  on: boolean,
  confirm?: string,
) => {
  const control = toggleOf(window, id);
  await control.scrollIntoViewIfNeeded();
  await control.click();
  if (confirm) {
    await window.getByRole('button', { name: exact(confirm) }).click();
  }
  if (on) {
    await expect(control).toBeChecked();
  } else {
    await expect(control).not.toBeChecked();
  }
};

/** subflows/search.yaml: searches from the list's header. */
export const search = async (window: Page, term: string) => {
  await shown(window.getByRole('button', { name: exact('T_search') })).click();
  const box = shown(window.getByTestId('search-box'));
  await box.fill(term);
  return box;
};
