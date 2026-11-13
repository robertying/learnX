import { Directory, File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import Share from 'react-native-share';
import mime from 'mime';
import ShareModule from '../../../modules/share';
import { DownloadableFile } from 'data/types/state';
import DeviceInfo from 'constants/DeviceInfo';
import { fileNameOf, sanitizeFileName } from 'helpers/filename';
import { t } from 'helpers/i18n';
import { downloadFile, SHARED_DIR } from './downloads';

/** Where a file is named for the save panel, under Caches. */
const SAVE_DIR = 'save';

/**
 * Asks where to save a copy of a file named `name` (the Mac save panel; the
 * Mac app may only write where people pick), after `stage` puts it in Caches
 * under that name. Resolves to false when cancelled.
 */
const saveOnMac = async (
  name: string,
  stage: (file: File) => Promise<void>,
) => {
  if (!ShareModule) {
    throw new Error('Saving files needs the LearnXShare module');
  }
  const dir = new Directory(Paths.cache, SAVE_DIR);
  dir.create({ intermediates: true, idempotent: true });
  const staged = new File(dir, name);
  await stage(staged);
  try {
    return await ShareModule.saveFile(staged.uri);
  } finally {
    try {
      staged.delete();
    } catch {}
  }
};

/**
 * Asks where to save a copy of a downloaded file (Mac). Resolves to false when
 * cancelled.
 */
export const saveFileOnMac = (
  file: Pick<DownloadableFile, 'title' | 'fileType'>,
  fromPath: string,
) =>
  saveOnMac(fileNameOf(file), staged =>
    new File(fromPath).copy(staged, { overwrite: true }),
  );

export const shareFile = async (file: DownloadableFile) => {
  const path = await downloadFile(file);

  await Share.open({
    filename: fileNameOf(file),
    url: path,
    type:
      (file.fileType && mime.getType(file.fileType)) ||
      'application/octet-stream',
    title: t('shareFile'),
    showAppsToView: true,
    failOnCancel: false,
  });
};

/** Shares text as a file, or on Mac asks where to save it. */
export const exportTextFile = async (
  filename: string,
  content: string,
  type: string,
) => {
  const name = sanitizeFileName(filename);
  if (DeviceInfo.isMac()) {
    await saveOnMac(name, staged => staged.write(content));
    return;
  }

  const file = new File(Paths.cache, name);
  await file.write(content);

  await Share.open({
    filename: name,
    url: file.uri,
    type,
    showAppsToView: true,
    failOnCancel: false,
  });
};

/** Lets the app that opens a file read it through its content URI. */
const FLAG_GRANT_READ_URI_PERMISSION = 1;

/** Opens a downloaded file in another app (Android). */
export const openFile = async (uri: string, extension?: string | null) => {
  const contentUri = uri.startsWith('content://')
    ? uri
    : new File(uri).contentUri;
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    type: (extension && mime.getType(extension)) || 'application/octet-stream',
    data: contentUri,
    flags: FLAG_GRANT_READ_URI_PERMISSION,
  });
};

/** Copies a file shared into the app to a place the app can read later. */
export const copyFileToCache = async (uri: string) => {
  const from = new File(uri);
  const dir = new Directory(Paths.cache, SHARED_DIR);
  dir.create({ intermediates: true, idempotent: true });
  const to = new File(dir, sanitizeFileName(from.name));
  await from.copy(to, { overwrite: true });
  return to.uri;
};
