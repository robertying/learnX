// .maestro/09-downloads.yaml: downloads a file, exports the downloads (the
// folder dialog answered by the main process's stand-in, cancelled first as
// the flow does) and deletes them.
import fs from 'node:fs';
import path from 'node:path';
import { expect, mockFilesDir, test } from './fixtures.ts';
import { exact, text } from './maestroEnv.ts';
import {
  byId,
  openCard,
  openSettings,
  openSettingsPage,
  openTab,
  shown,
} from './steps.ts';

// The mock account's files come from this checkout, not GitHub.
test.beforeEach(async ({ main }) => {
  await main.serveSites({ mockFilesDir });
});

test('downloads a file, exports it, then deletes it', async ({
  window,
  main,
  dataDir,
  login,
}) => {
  await login();
  await openTab(window, 'files');
  await openCard(window, 'MOCK_FILE', 'file-detail');
  await expect(byId(window, 'file-loading')).toBeHidden({ timeout: 60_000 });
  await expect(
    window
      .getByTestId('file-error')
      .or(window.getByTestId('file-preview-failed')),
  ).toHaveCount(0);

  await openSettings(window);
  await openSettingsPage(window, 'settings-downloads', 'downloads');
  const course = byId(window, 'downloads').locator(
    '[data-testid^="downloads-course-"]',
  );
  await expect(course).toHaveCount(1);

  // Cancelled: nothing is written.
  await byId(window, 'downloads-export').click();
  await expect.poll(async () => (await main.record()).dialogs.length).toBe(1);

  // A folder picked: learnX/<semester>/<course>/<title>.pdf in it.
  const exportDir = path.join(dataDir, 'exported');
  fs.mkdirSync(exportDir);
  await main.stub({ open: [exportDir] });
  await byId(window, 'downloads-export').click();
  await expect(
    shown(window.getByTestId('toast').getByText(text('T_downloadsExported'))),
  ).toBeVisible();
  const exported = fs
    .readdirSync(path.join(exportDir, 'learnX'), { recursive: true })
    .map(String);
  expect(
    exported.some(file =>
      new RegExp(`(${text('MOCK_FILE').source})\\.pdf$`).test(
        path.basename(file),
      ),
    ),
  ).toBe(true);

  await course.click();
  await window
    .getByRole('menuitem', { name: exact('T_deleteEllipsis') })
    .click();
  await window.getByRole('button', { name: exact('T_delete') }).click();
  await expect(course).toHaveCount(0);
  // Exported copies stay.
  expect(fs.readdirSync(path.join(exportDir, 'learnX'))).not.toEqual([]);
});
