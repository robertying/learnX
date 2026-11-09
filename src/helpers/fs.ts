import { Platform } from 'react-native';
import { Directory, DownloadTask, File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import Share from 'react-native-share';
import ShareMenu from 'react-native-share-menu';
import CookieManager from '@preeternal/react-native-cookie-manager';
import mime from 'mime';
import { addCSRF, dataSource, ensureSession } from 'data/source';
import { getSettings } from 'data/settings';
import { SUBMISSION_DRAFTS_DIR } from 'data/submissionDrafts';
import { queryClient, restoreQueryCache } from 'data/queryClient';
import { DownloadableFile } from 'data/types/state';
import Urls from 'constants/Urls';
import { sanitizeFileName } from './filename';
import { fileDownloadCheckUrl } from './fileDownloadCheck';
import DeviceInfo from 'constants/DeviceInfo';
import { t } from './i18n';

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

/** The folder downloads live in, under Documents or Caches. */
const DOWNLOADS_DIR = 'learnX Files';
/** Where files shared into the app are copied, under Caches. */
const SHARED_DIR = 'learnX Shared';

/**
 * The app's Documents or Caches folder, by the `fileUseDocumentDir` setting.
 */
const getBaseDirectory = (useDocumentDir = getSettings().fileUseDocumentDir) =>
  useDocumentDir ? Paths.document : Paths.cache;

/**
 * Where downloaded files live: `learnX Files/<course>/<id>/<name>` under the
 * base folder. Keeping them in their own folder means clearing them never
 * touches what other code keeps in Caches or Documents (WebKit, Crashlytics,
 * SQLite).
 */
const getDownloadsDirectory = (useDocumentDir?: boolean) =>
  new Directory(getBaseDirectory(useDocumentDir), DOWNLOADS_DIR);

export const ensureLearnXFilesDir = async () => {
  const dir = getDownloadsDirectory();
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
    ? file.title
    : `${file.courseName}-${file.title}`;

  return new File(
    getDownloadsDirectory(),
    sanitizeFileName(file.courseName),
    sanitizeFileName(file.id),
    sanitizeFileName(name, extension),
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
      await ensureSession();
    } catch {}
  }
  // Only a real download is emulated (mock account); a file already on the
  // device is not.
  await dataSource.prepareFileDownload();

  // Web Learning calls this check before every course file download; the
  // whole download then marks the file seen on the server.
  const checkUrl = fileDownloadCheckUrl(url);
  if (checkUrl) {
    await fetch(addCSRF(checkUrl)).catch(() => {});
  }

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
    onProgress: event => {
      // iOS reports the byte counts as BigInt, which can't be divided by a
      // number or formatted with toFixed.
      const bytesWritten = Number(event.bytesWritten);
      const totalBytes = Number(event.totalBytes);
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
  if (DeviceInfo.isMac()) {
    await new File(getMacDownloadDirectory(), filename).write(content);
    return;
  }

  const file = new File(Paths.cache, filename);
  await file.write(content);

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

const deleteDirectory = (dir: Directory) => {
  if (dir.exists) {
    dir.delete();
  }
};

/** Deletes downloaded files and files shared into the app. */
export const removeFileDir = async () => {
  const failed: string[] = [];
  for (const dir of [
    getDownloadsDirectory(true),
    getDownloadsDirectory(false),
    new Directory(Paths.cache, SHARED_DIR),
  ]) {
    try {
      deleteDirectory(dir);
    } catch {
      failed.push(dir.name);
    }
  }
  if (failed.length > 0) {
    throw new Error(failed.join(', '));
  }

  if (Platform.OS === 'ios') {
    await new Promise<void>(resolve => {
      ShareMenu.getSharedCacheDirectory(sharedDir => {
        try {
          if (sharedDir) {
            deleteDirectory(toDirectory(sharedDir));
          }
        } catch {}
        resolve();
      });
    });
  }
};

const subdirectories = (dir: Directory) =>
  dir.exists
    ? dir
        .list()
        .filter((entry): entry is Directory => entry instanceof Directory)
    : [];

const sizeOf = (dir: Directory) => {
  try {
    return dir.size ?? 0;
  } catch {
    return 0;
  }
};

export interface CourseDownloads {
  /** The course's folder name, which is its sanitized name. */
  courseName: string;
  /** Downloaded files, one per `<id>` folder. */
  count: number;
  /** Bytes on disk. */
  size: number;
}

/** Downloads grouped by course, largest first. */
export const listDownloads = (): CourseDownloads[] =>
  subdirectories(getDownloadsDirectory())
    .map(course => ({
      courseName: course.name,
      count: subdirectories(course).length,
      size: sizeOf(course),
    }))
    .filter(course => course.count > 0)
    .sort((a, b) => b.size - a.size);

/** Deletes one course's downloads; `courseName` is from `listDownloads`. */
export const removeCourseDownloads = (courseName: string) =>
  deleteDirectory(
    new Directory(getDownloadsDirectory(), sanitizeFileName(courseName)),
  );

/**
 * Moves one downloaded file's `<id>` folder into `<downloads>/<course>/`.
 * A copy already there wins; the moved one is dropped.
 */
const moveDownload = (from: Directory, courseName: string, id: string) => {
  const course = new Directory(
    getDownloadsDirectory(),
    sanitizeFileName(courseName),
  );
  course.create({ intermediates: true, idempotent: true });
  const to = new Directory(course, sanitizeFileName(id));
  if (to.exists) {
    from.delete();
  } else {
    // Moving onto a path that doesn't exist yet renames the folder.
    from.moveSync(to);
  }
};

/**
 * Moves downloads from the folder the `fileUseDocumentDir` setting no longer
 * points at, so switching it keeps the files and "Clear" still finds them.
 */
export const moveDownloadsToCurrentDirectory = () => {
  const other = getDownloadsDirectory(!getSettings().fileUseDocumentDir);
  for (const course of subdirectories(other)) {
    for (const download of subdirectories(course)) {
      try {
        moveDownload(download, course.name, download.name);
      } catch {}
    }
  }
  try {
    deleteDirectory(other);
  } catch {}
};

/**
 * Where an old `<courseName>-<id>` download folder belongs. Ids of items the
 * app still has cached give an exact match. Otherwise a folder with a single
 * file named `<courseName>-<title>` gives the course name as the part both
 * names share; anything else is left alone, since Caches and Documents also
 * hold other code's folders.
 */
const matchOldDownload = (
  dir: Directory,
  known: Map<string, { courseName: string; id: string }>,
) => {
  const exact = known.get(dir.name);
  if (exact) {
    return exact;
  }
  const entries = dir.list();
  const [file] = entries;
  if (entries.length !== 1 || !(file instanceof File)) {
    return null;
  }
  let common = 0;
  while (
    common < dir.name.length &&
    common < file.name.length &&
    dir.name[common] === file.name[common]
  ) {
    common++;
  }
  const dash = dir.name.lastIndexOf('-', common - 1);
  if (dash < 1 || dash === dir.name.length - 1) {
    return null;
  }
  return {
    courseName: dir.name.slice(0, dash),
    id: dir.name.slice(dash + 1),
  };
};

/**
 * Folders in Documents and Caches that are never old downloads: ours, and
 * expo-sqlite's databases and submission drafts' files in Documents.
 */
const notDownloads = new Set([
  DOWNLOADS_DIR,
  SHARED_DIR,
  'SQLite',
  SUBMISSION_DRAFTS_DIR,
]);

/**
 * `<courseName>-<id>` of every cached notice, assignment and file, and of
 * their attachments, which assignments download under the attachment's id.
 */
const knownDownloadFolders = () => {
  const known = new Map<string, { courseName: string; id: string }>();
  const add = (courseName: string, id: unknown) => {
    if (typeof id === 'string' && id) {
      known.set(`${courseName}-${id}`, { courseName, id });
    }
  };
  for (const name of ['notices', 'assignments', 'files']) {
    for (const [, items] of queryClient.getQueriesData<
      ({ id: string; courseName: string } & Record<string, unknown>)[]
    >({ queryKey: [name] })) {
      for (const item of items ?? []) {
        add(item.courseName, item.id);
        // attachment, submittedAttachment, gradeAttachment, answerAttachment
        for (const value of Object.values(item)) {
          if (value && typeof value === 'object' && 'downloadUrl' in value) {
            add(item.courseName, (value as { id?: unknown }).id);
          }
        }
      }
    }
  }
  return known;
};

/**
 * Earlier versions kept downloads in `<courseName>-<id>` folders right in
 * Documents or Caches. Moves them into the downloads folder; safe to run on
 * every launch.
 */
export const migrateDownloads = async () => {
  try {
    moveDownloadsToCurrentDirectory();
    await restoreQueryCache();
    const known = knownDownloadFolders();
    for (const base of [Paths.document, Paths.cache]) {
      for (const dir of subdirectories(base)) {
        if (notDownloads.has(dir.name)) {
          continue;
        }
        try {
          const match = matchOldDownload(dir, known);
          if (match) {
            moveDownload(dir, match.courseName, match.id);
          }
        } catch {}
      }
    }
  } catch {}
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
  const dir = new Directory(Paths.cache, SHARED_DIR);
  dir.create({ intermediates: true, idempotent: true });
  const to = new File(dir, from.name);
  await from.copy(to, { overwrite: true });
  return to.uri;
};

export { getExtension, stripExtension } from './filename';
