import { Directory, File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import Share from 'react-native-share';
import mime from 'mime';
import { DownloadableFile } from 'data/types/state';
import DeviceInfo from 'constants/DeviceInfo';
import { fileNameOf, sanitizeFileName } from 'helpers/filename';
import { t } from 'helpers/i18n';
import { downloadFile, SHARED_DIR } from './downloads';

/**
 * The Mac app's Downloads folder, next to its Documents folder in the app
 * container. The sandbox links it to the user's ~/Downloads.
 */
const getMacDownloadDirectory = () =>
  new Directory(Paths.document.parentDirectory, 'Downloads');

export const copyFileToMacDownloads = async (
  file: Pick<DownloadableFile, 'title' | 'fileType'>,
  fromPath: string,
) => {
  const to = new File(getMacDownloadDirectory(), fileNameOf(file));
  await new File(fromPath).copy(to, { overwrite: true });
  return to.uri;
};

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

export const exportTextFile = async (
  filename: string,
  content: string,
  type: string,
) => {
  const name = sanitizeFileName(filename);
  if (DeviceInfo.isMac()) {
    await new File(getMacDownloadDirectory(), name).write(content);
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
