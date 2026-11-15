import {
  type ApiError,
  type DownloadRequest,
  type DownloadResponse,
  FailReason,
} from '@robertying/thu-learn-lib';
import { Directory, DownloadTask, File, Paths } from 'expo-file-system';
import Share from 'modules/share';
import { dataSource } from 'data/source';
import { getCachedCourses } from 'data/queries';
import { localizedCourseName } from 'data/courseNames';
import { Course, DownloadableFile } from 'data/types/state';
import { fileNameOf, sanitizeFileName } from 'helpers/filename';

/** The folder downloads live in, under Caches. */
export const DOWNLOADS_DIR = 'downloads';
/** Where files shared into the app are copied, under Caches. */
export const SHARED_DIR = 'learnX Shared';
/**
 * Where a download is written until it finishes, under Caches. Only a whole
 * file is moved into `downloads`, so one cut short (the app killed, Android
 * writing straight into its target) never passes for a downloaded file.
 */
export const PARTIAL_DOWNLOADS_DIR = 'downloads-partial';
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

const getPartialDownloadsDirectory = () =>
  new Directory(Paths.cache, PARTIAL_DOWNLOADS_DIR);

let partialDownloadsSwept = false;

/**
 * Deletes what downloads cut short by the app being killed left behind. Runs
 * once, before this run of the app starts its first download, so it never
 * deletes one under way.
 */
const sweepPartialDownloads = () => {
  if (partialDownloadsSwept) {
    return;
  }
  partialDownloadsSwept = true;
  try {
    const dir = getPartialDownloadsDirectory();
    if (dir.exists) {
      dir.delete();
    }
  } catch {}
};

/** A new file to download into, named so no two downloads share it. */
const newPartialFile = () => {
  sweepPartialDownloads();
  const dir = getPartialDownloadsDirectory();
  dir.create({ intermediates: true, idempotent: true });
  return new File(
    dir,
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
  );
};

const deleteQuietly = (file: File) => {
  try {
    if (file.exists) {
      file.delete();
    }
  } catch {}
};

const isEmpty = (dir: Directory) => dir.list().length === 0;

/**
 * Deletes a download's `<id>` and course folders if they are empty, so
 * Downloads doesn't count them after a download that couldn't be saved.
 */
const removeEmptyFolders = (file: File) => {
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
 * The status a download client rejected for: expo-file-system fails a
 * download that got a status other than 2xx ("Unable to download a file:
 * server returned HTTP 403" on iOS, "…: HTTP 403" on Android) instead of
 * saving it.
 */
const httpStatusOf = (error: unknown) => {
  const match = /^Unable to download a file:.*\bHTTP (\d{3})\b/.exec(
    error instanceof Error ? error.message : '',
  );
  return match ? Number(match[1]) : undefined;
};

interface PartialDownload extends DownloadResponse {
  partial: File;
}

/**
 * Sends the download request thu-learn-lib hands it into a new partial file,
 * and reports what came back; thu-learn-lib tells the file from an expired
 * session's answer and from an error status, and discards what it won't use.
 */
const partialDownload =
  ({ onProgress, signal }: Pick<DownloadOptions, 'onProgress' | 'signal'>) =>
  async ({ url, headers }: DownloadRequest): Promise<PartialDownload> => {
    const partial = newPartialFile();
    const task = new DownloadTask(url, partial, {
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
    const discard = () => deleteQuietly(partial);
    try {
      await task.downloadAsync();
    } catch (error) {
      discard();
      const status = httpStatusOf(error);
      if (status === undefined) {
        throw error;
      }
      return { status, size: 0, text: async () => '', discard, partial };
    } finally {
      task.release();
    }
    return {
      status: 200,
      size: partial.exists ? partial.size : 0,
      text: async () => (partial.exists ? partial.text() : ''),
      discard,
      partial,
    };
  };

/** What a download that saved nothing rejects with. */
const emptyDownload: ApiError = {
  reason: FailReason.INVALID_RESPONSE,
  extra: 'empty file',
};

/**
 * The downloaded file's URI, downloading it first unless it is already on
 * the device (or `refresh` is set).
 */
export const downloadFile = async (
  file: DownloadableFile,
  { refresh = false, onProgress, signal }: DownloadOptions = {},
) => {
  const url = file.downloadUrl;
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

  // thu-learn-lib does what every Web Learning request needs (the CSRF token,
  // the session, the course file check, errors); the download client only
  // sends it.
  const { partial } = await dataSource.download(
    url,
    partialDownload({ onProgress, signal }),
  );
  if (partial.size === 0) {
    deleteQuietly(partial);
    throw emptyDownload;
  }

  // A rename within Caches: the file at `target` is either the old copy or
  // the whole new one.
  try {
    target.parentDirectory.create({ intermediates: true, idempotent: true });
    partial.moveSync(target, { overwrite: true });
  } catch {
    deleteQuietly(partial);
    removeEmptyFolders(target);
    throw new Error('File download failed');
  }

  saveCourseInfo(target.parentDirectory.parentDirectory, file);
  return target.uri;
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
    getPartialDownloadsDirectory(),
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
