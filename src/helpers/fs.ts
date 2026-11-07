import { Platform } from 'react-native';
import { Directory, DownloadTask, File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import Share from 'react-native-share';
import ShareMenu from 'react-native-share-menu';
import CookieManager from '@preeternal/react-native-cookie-manager';
import mime from 'mime';
import {
  addCSRF,
  emulateFileDownload,
  loginWithFingerPrint,
} from 'data/source';
import { getSettings } from 'data/settings';
import { DownloadableFile } from 'data/types/state';
import Urls from 'constants/Urls';
import DeviceInfo from 'constants/DeviceInfo';

/**
 * The Mac app's Downloads folder, next to its Documents folder in the app
 * container. The sandbox links it to the user's ~/Downloads.
 */
const getMacDownloadDirectory = () =>
  new Directory(Paths.document.parentDirectory, 'Downloads');

export const copyFileToMacDownloads = async (
  { title, fileType }: { title: string; fileType: string },
  fromPath: string,
) => {
  const to = new File(getMacDownloadDirectory(), `${title}.${fileType}`);
  await new File(fromPath).copy(to, { overwrite: true });
  return to.uri;
};

/**
 * Where downloaded files live: the app's Documents or Caches folder, by the
 * `fileUseDocumentDir` setting. Each file sits in a `<courseName>-<id>`
 * folder right under it, the layout react-native-fs used, so files
 * downloaded by earlier versions are found again.
 */
const getLearnXFilesDirectory = () =>
  getSettings().fileUseDocumentDir ? Paths.document : Paths.cache;

/**
 * Folders in the files directory that are not downloaded files. expo-sqlite
 * keeps its databases (settings, user data, query cache) in `SQLite` under
 * Documents.
 */
const keptEntries = new Set(['SQLite']);

export const ensureLearnXFilesDir = async () => {
  const dir = getLearnXFilesDirectory();
  dir.create({ intermediates: true, idempotent: true });
  return dir.uri;
};

/**
 * The server answers an expired session with a tiny HTML page that redirects
 * to the login page instead of an error status.
 */
const isLoginRedirect = async (file: File) =>
  file.size < 100 && (await file.text()).includes('location.href');

const deleteQuietly = (file: File) => {
  try {
    if (file.exists) {
      file.delete();
    }
  } catch {}
};

export const getDownloadedFile = (file: DownloadableFile) => {
  const settings = getSettings();
  const extension = file.fileType ? `.${file.fileType}` : '';
  const name = settings.fileOmitCourseName
    ? `${file.title}${extension}`
    : `${file.courseName}-${file.title}${extension}`;

  return new File(
    getLearnXFilesDirectory(),
    `${file.courseName}-${file.id}`,
    name,
  );
};

export const downloadFile = async (
  file: DownloadableFile,
  refresh?: boolean,
  onProgress?: (progress: number) => void,
) => {
  let url = file.downloadUrl;
  if (url.startsWith('file://') || url.startsWith('content://')) {
    return url;
  }

  const target = getDownloadedFile(file);
  if (!refresh && target.exists) {
    return target.uri;
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error('Invalid file url');
  }

  if (refresh) {
    try {
      await loginWithFingerPrint();
    } catch {}
  }
  // Only a real download is emulated; a file already on the device is not.
  await emulateFileDownload();
  url = addCSRF(url);

  target.parentDirectory.create({ intermediates: true, idempotent: true });

  // iOS sends the login cookies from the shared cookie store by itself;
  // Android's download client has no cookie jar, so they go in a header.
  let headers: Record<string, string> | undefined;
  if (Platform.OS === 'android') {
    const cookies = await CookieManager.get(Urls.learn);
    headers = {
      Cookie: Object.values(cookies).reduce(
        (acc, { name, value }) => `${acc}${name}=${value}; `,
        '',
      ),
    };
  }

  const task = new DownloadTask(url, target, {
    headers,
    // A background session would not share the app's cookies reliably and
    // outlives the screen that shows the progress.
    sessionType: 'foreground',
    onProgress: ({ bytesWritten, totalBytes }) => {
      if (totalBytes > 0) {
        // New architecture doesn't like native floats
        onProgress?.(parseFloat((bytesWritten / totalBytes).toFixed(2)));
      }
    },
  });

  let downloaded: File | null;
  try {
    downloaded = await task.downloadAsync();
  } catch {
    deleteQuietly(target);
    throw new Error('File download failed');
  } finally {
    task.release();
  }

  if (
    !downloaded?.exists ||
    downloaded.size === 0 ||
    (await isLoginRedirect(downloaded))
  ) {
    deleteQuietly(target);
    throw new Error('File download failed');
  }

  return downloaded.uri;
};

export const shareFile = async (file: DownloadableFile) => {
  const path = await downloadFile(file, false);

  await Share.open({
    filename: `${file.title}.${file.fileType}`,
    url: path,
    type:
      (file.fileType && mime.getType(file.fileType)) ||
      'application/octet-stream',
    title: '分享文件',
    showAppsToView: true,
    failOnCancel: false,
  });
};

export const exportTextFile = async (
  filename: string,
  content: string,
  type: string,
) => {
  if (DeviceInfo.isMac()) {
    new File(getMacDownloadDirectory(), filename).write(content);
    return;
  }

  const file = new File(Paths.cache, filename);
  file.write(content);

  await Share.open({
    filename,
    url: file.uri,
    type,
    showAppsToView: true,
    failOnCancel: false,
  });
};

const toDirectory = (path: string) =>
  new Directory(path.includes('://') ? path : `file://${path}`);

/** Deletes downloaded files and files shared into the app. */
export const removeFileDir = async () => {
  const dir = getLearnXFilesDirectory();
  if (dir.exists) {
    const failed = dir
      .list()
      .filter(entry => !keptEntries.has(entry.name))
      .filter(entry => {
        try {
          entry.delete();
          return false;
        } catch {
          return true;
        }
      });
    if (failed.length > 0) {
      throw new Error(failed.map(entry => entry.name).join(', '));
    }
  }

  if (Platform.OS === 'ios') {
    await new Promise<void>(resolve => {
      ShareMenu.getSharedCacheDirectory(sharedDir => {
        try {
          if (sharedDir) {
            const shared = toDirectory(sharedDir);
            if (shared.exists) {
              shared.delete();
            }
          }
        } catch {}
        resolve();
      });
    });
  }
};

export const openFile = async (uri: string, type?: string | null) => {
  const contentUri = uri.startsWith('content://')
    ? uri
    : new File(uri).contentUri;
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    type: (type && mime.getType(type)) || 'application/octet-stream',
    data: contentUri,
    flags: 1,
  });
};

/** Copies a file shared into the app to a place the app can read later. */
export const copyFileToCache = async (uri: string) => {
  const from = new File(uri);
  const to = new File(Paths.cache, from.name);
  await from.copy(to, { overwrite: true });
  return to.uri;
};

export const getExtension = (filename: string) => {
  return filename ? filename.split('.').pop() : '';
};

export const stripExtension = (filename: string) => {
  return filename ? filename.replace(/\.[^/.]+$/, '') : '';
};
