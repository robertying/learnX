// What the Electron app does with a downloaded file instead of sharing it:
// opening it in its default app, showing it in the file manager, saving a
// copy where the user picks, and copying its link. The main process asks
// the system (electron/fileShell.ts); only called in the Electron app.
import { DownloadableFile } from 'data/types/state';
import { fileNameOf, sanitizeFileName } from 'helpers/filename';
import { t } from 'helpers/i18n';
import { bridge } from 'web/bridge';

/**
 * Opens a downloaded file in its default app; throws if it couldn't. One
 * that would run a program asks first, in a dialog of the system's.
 */
export const openInDefaultApp = async (uri: string) => {
  const error = await bridge().shell.open(uri, {
    // The main process fills in the file's name.
    message: t('openRunnableTitle', { name: '{name}' }),
    detail: t('openRunnableMessage'),
    open: t('open'),
    cancel: t('cancel'),
  });
  if (error) {
    throw new Error(error);
  }
};

export const showInFolder = (uri: string) => bridge().shell.showInFolder(uri);

/**
 * Asks where to save a copy of a downloaded file, under its title. Resolves
 * to false when cancelled.
 */
export const saveFileAs = async (
  file: Pick<DownloadableFile, 'title' | 'fileType'>,
  uri: string,
) => (await bridge().shell.saveAs(uri, fileNameOf(file))) !== null;

/**
 * Asks where to save text as a file named `filename`. Resolves to false when
 * cancelled.
 */
export const saveTextAs = async (filename: string, content: string) =>
  (await bridge().shell.saveText(sanitizeFileName(filename), content)) !== null;

/** Copies text, such as a file's link, to the clipboard. */
export const copyText = (text: string) => bridge().shell.copyText(text);
