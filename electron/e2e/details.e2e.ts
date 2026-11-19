// .maestro/03-details.yaml: opens a notice, an assignment and a file, each
// beside its list, and names the window after the one open.
import type { ElectronApplication } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { text } from './maestroEnv.ts';
import { byId, openCard, openTab } from './steps.ts';

/** The window's title, as Alt+Tab, the taskbar and screen readers say it. */
const windowTitle = (app: ElectronApplication) =>
  app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].title);

test('opens a notice, an assignment and a file', async ({
  app,
  window,
  login,
}) => {
  await login();

  await openTab(window, 'notices');
  await openCard(window, 'MOCK_NOTICE', 'notice-detail');
  await expect(
    byId(window, 'notice-detail').getByRole('heading', {
      name: text('MOCK_NOTICE'),
    }),
  ).toBeVisible();
  await expect
    .poll(() => windowTitle(app))
    .toMatch(new RegExp(`^(${text('MOCK_NOTICE').source}) - learnX$`));

  await openTab(window, 'assignments');
  await openCard(window, 'MOCK_ASSIGNMENT', 'assignment-detail');
  await expect(
    byId(window, 'assignment-detail').getByText(
      text('MOCK_ASSIGNMENT_ATTACHMENT'),
    ),
  ).toBeVisible();

  await openTab(window, 'files');
  await openCard(window, 'MOCK_FILE', 'file-detail');
});
