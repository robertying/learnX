// What the Electron app does with a downloaded file instead of the phone's
// share sheet: previews PDFs and pictures on app://files/, opens a file in
// its default app, saves a copy with Save As and shows it in its folder,
// all through the main process's stand-ins (mainProcess.ts).
// Exporting every download is in downloads.e2e.ts.
import fs from 'node:fs';
import path from 'node:path';
import type { ElectronApplication } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { exact, text } from './maestroEnv.ts';
import { byId, card, goBack, openCard, openTab, shown } from './steps.ts';

/** The URLs of the window's frames: the PDF preview is one of them. */
const frameUrls = (app: ElectronApplication) =>
  app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].webContents.mainFrame.framesInSubtree.map(
      frame => frame.url,
    ),
  );

const downloaded = async (window: import('@playwright/test').Page) => {
  await expect(byId(window, 'file-loading')).toBeHidden({ timeout: 60_000 });
  await expect(
    window
      .getByTestId('file-error')
      .or(window.getByTestId('file-preview-failed')),
  ).toHaveCount(0);
};

test('previews a PDF and a picture, and shows details for the rest', async ({
  app,
  window,
  login,
}) => {
  await login();
  await openTab(window, 'files');

  await openCard(window, 'MOCK_FILE', 'file-detail');
  await downloaded(window);
  await expect
    .poll(async () =>
      (await frameUrls(app)).some(url =>
        /^app:\/\/files\/cache\/.+\.pdf$/.test(url),
      ),
    )
    .toBe(true);

  await openCard(window, 'MOCK_IMAGE_FILE', 'file-detail');
  await downloaded(window);
  const image = byId(window, 'file-detail').locator('img[src^="app://files/"]');
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate(img => (img as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);

  // Not previewable: its details, with Open in Default App first.
  await openCard(window, 'MOCK_OTHER_FILE', 'file-detail');
  await downloaded(window);
  await expect(byId(window, 'file-info')).toBeVisible();
  await expect(
    shown(window.getByText(text('T_fileOpensInDefaultApp'))),
  ).toBeVisible();
});

test('opens, saves and shows a file in its folder', async ({
  window,
  main,
  dataDir,
  login,
}) => {
  await login();
  await openTab(window, 'files');
  await openCard(window, 'MOCK_FILE', 'file-detail');
  await downloaded(window);
  /** A button of the detail pane's header. */
  const header = (name: string) =>
    shown(window.getByRole('button', { name: exact(name) }));

  await header('T_openInDefaultApp').click();
  await expect
    .poll(async () => (await main.record()).openedPaths)
    .toHaveLength(1);
  const [opened] = (await main.record()).openedPaths;
  // In the test's data folder (as the system names it: Windows' temporary
  // folder can be a short 8.3 path, macOS's a link into /private).
  expect(
    fs.realpathSync.native(opened).startsWith(fs.realpathSync.native(dataDir)),
  ).toBe(true);
  expect(opened).toMatch(/\.pdf$/);

  const saved = path.join(dataDir, 'Saved.pdf');
  await main.stub({ save: saved });
  await header('T_saveAs').click();
  // Once the app says so: the copy shows in the folder before it's written.
  await expect(
    shown(window.getByTestId('toast').getByText(text('T_saveFileSucceeded'))),
  ).toBeVisible();
  expect(fs.readFileSync(saved).equals(fs.readFileSync(opened))).toBe(true);
  const save = (await main.record()).dialogs.find(d => d.type === 'save');
  expect(save?.options).toMatchObject({
    defaultPath: expect.stringMatching(/\.pdf$/),
  });

  // The details' buttons.
  await header('T_info').click();
  await expect(byId(window, 'file-info')).toBeVisible();
  await byId(window, 'file-info')
    .getByRole('button', { name: exact('T_showInFolder') })
    .click();
  await expect
    .poll(async () => (await main.record()).shownInFolder)
    .toEqual([opened]);
});

test("keeps Full Screen to the file's own tab", async ({ window, login }) => {
  await login();
  await openTab(window, 'files');
  await openCard(window, 'MOCK_FILE', 'file-detail');
  const header = (name: string) =>
    shown(window.getByRole('button', { name: exact(name) }));

  // The list moves off the window's edge, and out of the keyboard's reach.
  const list = card(window, 'MOCK_OTHER_FILE');
  const master = window.getByTestId('split-master');
  await header('T_fullscreen').click();
  await expect(list).not.toBeInViewport();
  await expect(master).toHaveJSProperty('inert', true);
  await expect(header('T_exitFullscreen')).toBeVisible();

  // Another tab still shows its list, to pick something from.
  await openTab(window, 'notices');
  await expect(card(window, 'MOCK_NOTICE')).toBeInViewport();

  // Back in Files, the file is still full screen.
  await openTab(window, 'files');
  await expect(list).not.toBeInViewport();
  await header('T_exitFullscreen').click();
  await expect(list).toBeInViewport();
  await expect(master).toHaveJSProperty('inert', false);
});

test('brings the list back when going back from a full screen file', async ({
  window,
  login,
}) => {
  await login();
  await openTab(window, 'courses');
  await openCard(window, 'MOCK_COURSE', 'course-detail');
  const course = byId(window, 'course-detail');
  await course.getByRole('tab', { name: exact('T_files') }).click();
  // The course's own file (MOCK_FILE is another course's).
  await shown(course.getByTestId('file-card')).click();
  await expect(byId(window, 'file-detail')).toBeVisible();

  const list = card(window, 'MOCK_COURSE');
  await shown(
    window.getByRole('button', { name: exact('T_fullscreen') }),
  ).click();
  await expect(list).not.toBeInViewport();

  // The header's back leaves full screen with the file.
  await goBack(window);
  await expect(byId(window, 'course-detail')).toBeVisible();
  await expect(list).toBeInViewport();
});
