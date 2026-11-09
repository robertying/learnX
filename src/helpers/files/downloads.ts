import { Platform } from 'react-native';
import { Directory, DownloadTask, File, Paths } from 'expo-file-system';
import ShareMenu from 'react-native-share-menu';
import CookieManager from '@preeternal/react-native-cookie-manager';
import { addCSRF, dataSource, ensureSession } from 'data/source';
import { getSettings } from 'data/settings';
import { DownloadableFile } from 'data/types/state';
import Urls from 'constants/Urls';
import { fileNameOf, sanitizeFileName } from 'helpers/filename';
import { isLearnUrl } from 'helpers/learnUrl';
import { fileDownloadCheckUrl } from 'helpers/fileDownloadCheck';

/** The folder downloads live in, under Documents or Caches. */
export const DOWNLOADS_DIR = 'learnX Files';
/** Where files shared into the app are copied, under Caches. */
export const SHARED_DIR = 'learnX Shared';

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

/** Creates the downloads folder if needed and returns its URI. */
export const ensureDownloadsDirectory = () => {
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
  const title = settings.fileOmitCourseName
    ? file.title
    : `${file.courseName}-${file.title}`;

  return new File(
    getDownloadsDirectory(),
    sanitizeFileName(file.courseName),
    sanitizeFileName(file.id),
    fileNameOf({ title, fileType: file.fileType }),
  );
};

export interface DownloadOptions {
  /** Downloads again even when the file is already on the device. */
  refresh?: boolean;
  /** Called with the share downloaded so far, 0 to 1 in steps of 0.01. */
  onProgress?: (progress: number) => void;
  /** Cancels the download; the promise then rejects. */
  signal?: AbortSignal;
}

/**
 * The downloaded file's URI, downloading it first unless it is already on
 * the device (or `refresh` is set).
 */
export const downloadFile = async (
  file: DownloadableFile,
  { refresh = false, onProgress, signal }: DownloadOptions = {},
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
  // Android's download client has no cookie jar, so they go in a header, and
  // only to Web Learning.
  let headers: Record<string, string> | undefined;
  if (Platform.OS === 'android' && isLearnUrl(url)) {
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
    signal,
    onProgress: event => {
      // iOS reports the byte counts as BigInt, which can't be divided by a
      // number or formatted with toFixed.
      const bytesWritten = Number(event.bytesWritten);
      const totalBytes = Number(event.totalBytes);
      if (totalBytes > 0) {
        // Rounded to whole percents, so a screen showing it re-renders at
        // most 100 times.
        onProgress?.(Math.round((bytesWritten / totalBytes) * 100) / 100);
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

const toDirectory = (path: string) =>
  new Directory(path.includes('://') ? path : `file://${path}`);

export const deleteDirectory = (dir: Directory) => {
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

export const subdirectories = (dir: Directory) =>
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
export const moveDownload = (
  from: Directory,
  courseName: string,
  id: string,
) => {
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
