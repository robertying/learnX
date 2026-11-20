// What only the Electron app does for screen readers and the keyboard: every
// control and frame has a name, headings aren't empty, toasts have a status
// region to be announced in, the navigation pane takes the arrow keys, and
// Tab never reaches what's out of sight. The phones' screen readers come
// with the native views; here every name is the app's own.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import {
  byId,
  card,
  openCard,
  openSettings,
  openTab,
  search,
} from './steps.ts';

/** Roles that a screen reader stops at and has to say a name for. */
const NAMED_ROLES = new Set([
  'button',
  'link',
  'tab',
  'checkbox',
  'switch',
  'radio',
  'textbox',
  'searchbox',
  'combobox',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'slider',
  'progressbar',
  'image',
  'img',
  'heading',
  'Iframe',
  'separator',
]);

interface AXNode {
  ignored: boolean;
  role?: { value: string };
  name?: { value: string };
  properties?: { name: string; value: { value: unknown } }[];
}

/**
 * What a screen reader finds with no name on the page as Chromium exposes
 * it: controls, frames and headings, and anything that takes focus.
 */
const unnamed = async (window: Page) => {
  const cdp = await window.context().newCDPSession(window);
  try {
    const { nodes } = (await cdp.send('Accessibility.getFullAXTree')) as {
      nodes: AXNode[];
    };
    return nodes
      .filter(node => !node.ignored)
      .filter(node => {
        const role = node.role?.value ?? '';
        const focusable = node.properties?.some(
          p => p.name === 'focusable' && p.value.value,
        );
        // The page itself takes focus; a separator that doesn't is a line.
        return (
          role !== 'RootWebArea' &&
          (role === 'separator'
            ? focusable
            : NAMED_ROLES.has(role) || focusable)
        );
      })
      .filter(node => !node.name?.value.trim())
      .map(node => node.role?.value);
  } finally {
    await cdp.detach();
  }
};

/** Checks the page as it is now has a name for everything. */
const expectNamed = async (window: Page, where: string) => {
  await expect
    .poll(() => unnamed(window), { message: `unnamed on ${where}` })
    .toEqual([]);
};

/** The element that has focus, described for a test failure. */
const focused = (window: Page) =>
  window.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    if (!element || element === document.body) {
      return null;
    }
    return {
      label: (element.getAttribute('aria-label') ?? element.textContent ?? '')
        .trim()
        .slice(0, 60),
      inPane: !!element.closest('[data-testid="navigation-pane"]'),
    };
  });

test('names every control, frame and heading on each screen', async ({
  window,
  login,
}) => {
  await window
    .getByTestId('welcome-continue')
    .or(window.getByTestId('login-username'))
    .first()
    .waitFor();
  await expectNamed(window, 'welcome');
  await login();
  // There before any toast, so screen readers announce each one that comes.
  await expect(
    window.locator('[role="status"][aria-live="polite"]'),
  ).toHaveCount(1);
  await expectNamed(window, 'today');

  const pages = [
    ['notices', 'MOCK_NOTICE', 'notice-detail'],
    ['assignments', 'MOCK_ASSIGNMENT', 'assignment-detail'],
    ['files', 'MOCK_FILE', 'file-detail'],
    ['courses', 'MOCK_COURSE', 'course-detail'],
  ] as const;
  for (const [tab, item, detail] of pages) {
    await openTab(window, tab);
    await expect(card(window, item)).toBeVisible();
    await expectNamed(window, tab);
    await openCard(window, item, detail);
    await expectNamed(window, detail);
  }

  await search(window, 'Lab');
  await expectNamed(window, 'search');
  await window.keyboard.press('Escape');
  await openSettings(window);
  await expectNamed(window, 'settings');
});

test('moves through the navigation pane with the arrow keys, in one Tab stop', async ({
  window,
  login,
}) => {
  await login();
  const tab = (name: string) => window.getByTestId(`tab-${name}`);
  await tab('today').focus();

  await window.keyboard.press('ArrowDown');
  await expect(tab('notices')).toBeFocused();
  await window.keyboard.press('ArrowUp');
  await window.keyboard.press('ArrowUp');
  // Round to the foot of the pane.
  await expect(tab('settings')).toBeFocused();
  await window.keyboard.press('ArrowDown');
  await expect(tab('today')).toBeFocused();
  await window.keyboard.press('ArrowDown');
  await window.keyboard.press('Enter');
  await expect(tab('notices')).toHaveAttribute('aria-selected', 'true');

  // Tab leaves the pane for the page, and Shift+Tab comes back to the tab
  // it left.
  await window.keyboard.press('Tab');
  expect((await focused(window))?.inPane).toBe(false);
  await window.keyboard.press('Shift+Tab');
  await expect(tab('notices')).toBeFocused();
});

test("keeps a course's other pages out of Tab", async ({ window, login }) => {
  await login();
  await openTab(window, 'courses');
  await openCard(window, 'MOCK_COURSE', 'course-detail');
  const tabs = byId(window, 'course-detail').getByRole('tab');
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  await tabs.first().focus();

  // Through the selected page's cards and around the window: focusing a
  // card of another page would scroll the pager to it, under the first tab.
  const scrolled = () =>
    window.evaluate(() =>
      [...document.querySelectorAll('[data-testid="course-detail"] *')].some(
        element => element.scrollLeft !== 0,
      ),
    );
  const seen: string[] = [];
  for (let i = 0; i < 30; i++) {
    await window.keyboard.press('Tab');
    const now = await focused(window);
    expect(now, `stop ${i} after ${seen.join(' > ')}`).not.toBeNull();
    seen.push(now!.label);
    expect(await scrolled(), `${now!.label} scrolled the pager`).toBe(false);
  }
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  await expect(tabs.first()).toBeInViewport();
});
