// The Electron app's back and close keys, as Windows apps take them: Alt+←
// and the mouse's back button go a page back, Esc closes a sheet.
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { exact, maestroEnv } from './maestroEnv.ts';
import {
  byId,
  card,
  drawn,
  openCard,
  openMenu,
  openTab,
  search,
  shown,
} from './steps.ts';

/**
 * Presses the mouse's back button over `over`, as a mouse sends it: through
 * the window's input, which Playwright's mouse has no button for.
 */
const mouseBack = async (window: Page, over: Locator) => {
  const box = (await over.boundingBox())!;
  const cdp = await window.context().newCDPSession(window);
  const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  for (const type of ['mousePressed', 'mouseReleased'] as const) {
    await cdp.send('Input.dispatchMouseEvent', {
      type,
      button: 'back',
      clickCount: 1,
      ...at,
    });
  }
  await cdp.detach();
};

test('goes back in the detail pane with Alt+← and the mouse', async ({
  window,
  login,
}) => {
  await login();
  await openTab(window, 'assignments');
  await openCard(window, 'MOCK_ASSIGNMENT', 'assignment-detail');
  await shown(window.getByRole('button', { name: exact('T_submit') })).click();
  await expect(byId(window, 'assignmentSubmission')).toBeVisible();
  await window.keyboard.press('Alt+ArrowLeft');
  await expect(byId(window, 'assignmentSubmission')).toBeHidden();
  await expect(byId(window, 'assignment-detail')).toBeVisible();
  // Nothing further back in the pane, and the list's tab stays.
  await window.keyboard.press('Alt+ArrowLeft');
  await expect(byId(window, 'assignment-detail')).toBeVisible();
  await expect(window.getByTestId('tab-assignments')).toHaveAttribute(
    'aria-selected',
    'true',
  );

  await openTab(window, 'courses');
  await openCard(window, 'MOCK_COURSE', 'course-detail');
  await shown(
    window.getByRole('button', { name: exact('T_courseInformation') }),
  ).click();
  await expect(byId(window, 'courseXReload')).toBeVisible();
  // Over the navigation pane: a web view takes its own mouse input.
  await mouseBack(window, window.getByTestId('navigation-pane'));
  await expect(byId(window, 'courseXReload')).toBeHidden();
  await expect(byId(window, 'course-detail')).toBeVisible();
});

test('goes back in a sheet, and closes it with Esc', async ({
  window,
  login,
}) => {
  await login();
  await openTab(window, 'notices');
  const box = await search(window, maestroEnv().MOCK_SEARCH_TERM);
  await card(window, 'MOCK_SEARCH_NOTICE').click();
  await expect(byId(window, 'notice-detail')).toBeVisible();
  await drawn(window);

  // A page back, to the results.
  await window.keyboard.press('Alt+ArrowLeft');
  await expect(box).toBeVisible();
  await expect(byId(window, 'notice-detail')).toBeHidden();
  // From the first page, Alt+← closes the sheet as its Close button does.
  await window.keyboard.press('Alt+ArrowLeft');
  await expect(window.getByTestId('search-box')).toBeHidden();

  // Esc closes a menu in the sheet, not the sheet.
  await search(window, maestroEnv().MOCK_SEARCH_TERM);
  await openMenu(
    window,
    shown(window.getByRole('button', { name: exact('T_filter') })),
  );
  await window.keyboard.press('Escape');
  await expect(window.getByRole('menu')).toBeHidden();
  await expect(byId(window, 'search-box')).toBeVisible();
  // Then the sheet, from any of its pages.
  await card(window, 'MOCK_SEARCH_NOTICE').click();
  await expect(byId(window, 'notice-detail')).toBeVisible();
  await drawn(window);
  await window.keyboard.press('Escape');
  await expect(window.getByTestId('search-box')).toBeHidden();
  await expect(byId(window, 'notice-detail')).toBeHidden();
});
