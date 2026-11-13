import { Platform } from 'react-native';
import { Directory, DownloadTask, File, Paths } from 'expo-file-system';
import Share from '../../../modules/share';
import CookieManager from '@preeternal/react-native-cookie-manager';
import { addCSRF, dataSource, ensureSession } from 'data/source';
import { getCachedCourses } from 'data/queries';
import { localizedCourseName } from 'data/courseNames';
import { Course, DownloadableFile } from 'data/types/state';
import Urls from 'constants/Urls';
import { fileNameOf, sanitizeFileName } from 'helpers/filename';
import { isLearnUrl } from 'helpers/learnUrl';
import { fileDownloadCheckUrl } from 'helpers/fileDownloadCheck';

/** The folder downloads live in, under Caches. */
export const DOWNLOADS_DIR = 'downloads';
/** Where files shared into the app are copied, under Caches. */
export const SHARED_DIR = 'learnX Shared';
/** Where versions up to 18.x kept downloads, under Caches or Documents. */
export const LEGACY_DOWNLOADS_DIR = 'learnX Files';
/** The course a `<course id>` folder holds files of (`CourseInfo`). */
const COURSE_INFO_FILE = 'course.json';

/**
 * Where downloaded files live: `downloads/<course id>/<file id>/<name>` under
 * Caches. Ids don't change with the app's language or the course's name, so a
 * download stays found; Export copies the files out with names people read.
 * Keeping them in their own folder means clearing them never touches what
 * other code keeps in Caches (WebKit, Crashlytics).
 */
export const getDownloadsDirectory = () =>
  new Directory(Paths.cache, DOWNLOADS_DIR);

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

const isEmpty = (dir: Directory) => dir.list().length === 0;

/**
 * Deletes a failed or cancelled download's file, then its `<id>` and course
 * folders if that left them empty, so Downloads doesn't count them.
 */
const discardDownload = (file: File) => {
  deleteQuietly(file);
  for (
    let dir = file.parentDirectory, depth = 0;
    depth < 2;
    dir = dir.parentDirectory, depth++
  ) {
    try {
      if (!dir.exists || !isEmpty(dir)) {
        return;
      }
      dir.delete();
    } catch {
      return;
    }
  }
};

export const getDownloadedFile = (file: DownloadableFile) =>
  new File(
    getDownloadsDirectory(),
    sanitizeFileName(file.courseId),
    sanitizeFileName(file.id),
    fileNameOf(file),
  );

/** What `course.json` keeps of a course, to name it when it isn't cached. */
export type CourseInfo = Partial<
  Pick<Course, 'name' | 'chineseName' | 'englishName' | 'semesterId'>
>;

/**
 * Writes the course's names and semester next to its downloads, from the
 * cached course or else the name the file was shown with.
 */
const saveCourseInfo = (dir: Directory, file: DownloadableFile) => {
  const course = getCachedCourses().find(c => c.id === file.courseId);
  const info: CourseInfo = course
    ? {
        name: course.name,
        chineseName: course.chineseName,
        englishName: course.englishName,
        semesterId: course.semesterId,
      }
    : { name: file.courseName };
  try {
    new File(dir, COURSE_INFO_FILE).writeSync(JSON.stringify(info));
  } catch {}
};

/** The course of a `<course id>` folder, cached or from its `course.json`. */
export const readCourseInfo = (dir: Directory): CourseInfo => {
  const course = getCachedCourses().find(c => c.id === dir.name);
  if (course) {
    return course;
  }
  try {
    const info = JSON.parse(new File(dir, COURSE_INFO_FILE).textSync());
    return info && typeof info === 'object' ? (info as CourseInfo) : {};
  } catch {
    return {};
  }
};

/** A course's name in the app's language, or its folder's name. */
export const courseNameOf = (dir: Directory, info = readCourseInfo(dir)) =>
  localizedCourseName({
    name: info.name ?? '',
    chineseName: info.chineseName ?? '',
    englishName: info.englishName ?? '',
  }) ||
  info.chineseName ||
  info.englishName ||
  dir.name;

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
    discardDownload(target);
    throw new Error('File download failed');
  } finally {
    task.release();
  }

  if (
    !downloaded?.exists ||
    downloaded.size === 0 ||
    (await isLoginRedirect(downloaded))
  ) {
    discardDownload(target);
    throw new Error('File download failed');
  }

  saveCourseInfo(target.parentDirectory.parentDirectory, file);
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
    getDownloadsDirectory(),
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

  // The iOS share extension's copies, in the app group.
  const sharedDir = Share?.getSharedFilesDirectory();
  if (sharedDir) {
    try {
      deleteDirectory(toDirectory(sharedDir));
    } catch {}
  }
};

/**
 * Deletes the downloads that versions up to 18.x kept in Caches or Documents,
 * which the app doesn't look for; they download again when opened.
 */
export const removeLegacyDownloads = () => {
  for (const base of [Paths.cache, Paths.document]) {
    try {
      deleteDirectory(new Directory(base, LEGACY_DOWNLOADS_DIR));
    } catch {}
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

/** The `<file id>` folders of a course folder that hold a file. */
export const downloadsOf = (course: Directory) =>
  subdirectories(course).filter(dir => !isEmpty(dir));

export interface CourseDownloads {
  courseId: string;
  /** In the app's language. */
  courseName: string;
  /** Downloaded files, one per `<file id>` folder. */
  count: number;
  /** Bytes on disk. */
  size: number;
}

/** Downloads grouped by course, largest first. */
export const listDownloads = (): CourseDownloads[] =>
  subdirectories(getDownloadsDirectory())
    .map(course => {
      const downloads = downloadsOf(course);
      return {
        courseId: course.name,
        courseName: courseNameOf(course),
        count: downloads.length,
        size: downloads.reduce((total, dir) => total + sizeOf(dir), 0),
      };
    })
    .filter(course => course.count > 0)
    .sort((a, b) => b.size - a.size);

/** Deletes one course's downloads; `courseId` is from `listDownloads`. */
export const removeCourseDownloads = (courseId: string) =>
  deleteDirectory(
    new Directory(getDownloadsDirectory(), sanitizeFileName(courseId)),
  );
