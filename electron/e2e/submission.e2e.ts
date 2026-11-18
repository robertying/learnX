// Submitting an assignment in the Electron app: the attachment comes from
// the system's open dialog (answered by the main process's stand-in) or is
// dragged onto the submission page from the file manager, then goes up to
// the mock server. 07-screens opens the page; this sends it.
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { exact } from './maestroEnv.ts';
import { byId, drawn, openCard, openTab, shown } from './steps.ts';

const openSubmission = async (window: Page) => {
  await openTab(window, 'assignments');
  await openCard(window, 'MOCK_ASSIGNMENT', 'assignment-detail');
  await shown(window.getByRole('button', { name: exact('T_submit') })).click();
  await expect(byId(window, 'assignmentSubmission')).toBeVisible();
  // Over the assignment's description, a web view.
  await drawn(window);
};

/** Submits, confirmed in the dialog, and waits for it to go through. */
const submit = async (window: Page) => {
  await shown(window.getByRole('button', { name: exact('T_submit') })).click();
  await window
    .getByRole('dialog')
    .getByRole('button', { name: exact('T_submit') })
    .click();
  await expect(
    shown(
      window
        .getByTestId('toast')
        .getByText(exact('T_assignmentSubmissionSucceeded')),
    ),
  ).toBeVisible();
  await expect(byId(window, 'assignmentSubmission')).toBeHidden();
};

test('submits a file chosen in the open dialog', async ({
  window,
  main,
  dataDir,
  login,
}) => {
  const report = path.join(dataDir, 'report.pdf');
  fs.writeFileSync(report, '%PDF-1.4\n% learnX E2E\n');
  await login();
  await openSubmission(window);

  // No choice of where from: Windows and Linux keep photos in files, so
  // Choose Attachment goes straight to the open dialog.
  await main.stub({ open: [report] });
  await byId(window, 'pickAttachment').click();
  await expect(byId(window, 'submissionFilename')).toBeVisible();
  await expect(window.getByRole('dialog')).toHaveCount(0);
  const pickAgain = shown(
    window.getByRole('button', { name: exact('T_reUploadAttachment') }),
  );
  await expect(pickAgain).toBeVisible();

  // Another one, a picture: the same open dialog.
  const photo = path.join(dataDir, 'photo.png');
  fs.copyFileSync(
    path.join(import.meta.dirname, '..', 'icons', 'icon.png'),
    photo,
  );
  await main.stub({ open: [photo] });
  await pickAgain.click();
  await expect
    .poll(async () =>
      (await main.record()).dialogs.filter(d => d.type === 'open'),
    )
    .toHaveLength(2);
  await expect(byId(window, 'submissionFilename')).toBeVisible();

  await submit(window);
});

test('submits a file dropped onto the page', async ({ window, login }) => {
  await login();
  await openSubmission(window);

  // What a drag from the file manager carries: a file.
  const files = await window.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.items.add(
      new File(['learnX E2E'], 'dropped.txt', { type: 'text/plain' }),
    );
    return transfer;
  });
  const target = byId(window, 'pickAttachment');
  await target.dispatchEvent('dragenter', { dataTransfer: files });
  await target.dispatchEvent('dragover', { dataTransfer: files });
  await expect(byId(window, 'file-drop-overlay')).toBeVisible();
  await expect(shown(window.getByText(exact('T_dropToAttach')))).toBeVisible();
  await target.dispatchEvent('drop', { dataTransfer: files });
  await expect(byId(window, 'file-drop-overlay')).toBeHidden();
  await expect(byId(window, 'submissionFilename')).toBeVisible();

  await submit(window);
});

test('ignores a drag that carries no file', async ({ window, login }) => {
  await login();
  await openSubmission(window);
  const link = await window.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.setData('text/uri-list', 'https://learn.tsinghua.edu.cn/');
    return transfer;
  });
  const target = byId(window, 'pickAttachment');
  await target.dispatchEvent('dragenter', { dataTransfer: link });
  await target.dispatchEvent('drop', { dataTransfer: link });
  await expect(byId(window, 'file-drop-overlay')).toHaveCount(0);
  await expect(window.getByTestId('submissionFilename')).toHaveCount(0);
});
