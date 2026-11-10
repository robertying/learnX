import { Directory, File } from 'expo-file-system';
import mime from 'mime';
import { sanitizeFileName } from 'helpers/filename';
import { getSemesterTextFromId } from 'helpers/semester';
import {
  courseNameOf,
  downloadsOf,
  getDownloadsDirectory,
  readCourseInfo,
  subdirectories,
} from './downloads';

/** The folder Export makes in the folder people pick. */
export const EXPORT_DIR = 'learnX';

/**
 * The child folder `name` of `dir`, made if missing. Looked up by listing,
 * since a folder picked on Android is a content URI that can't be joined
 * with a name like a path.
 */
const childDirectory = (dir: Directory, name: string) =>
  dir
    .list()
    .find(
      (entry): entry is Directory =>
        entry instanceof Directory && entry.name === name,
    ) ?? dir.createDirectory(name);

/**
 * `name`, or `name (2)`, `name (3)`… before the extension when a file of the
 * course already took it. Compared ignoring case, as Apple's and Android's
 * file systems do.
 */
const uniqueName = (name: string, taken: Set<string>) => {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot) : '';
  let candidate = name;
  for (let n = 2; taken.has(candidate.toLowerCase()); n++) {
    candidate = `${base} (${n})${extension}`;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
};

/** Names in one folder are unique, so they never tie. */
const byName = (a: { name: string }, b: { name: string }) =>
  a.name < b.name ? -1 : 1;

/** A course folder's files, in an order that stays the same between exports. */
const filesOf = (course: Directory) =>
  downloadsOf(course)
    .sort(byName)
    .flatMap(dir =>
      dir
        .list()
        .filter((entry): entry is File => entry instanceof File)
        .sort(byName),
    );

export interface ExportResult {
  exported: number;
  failed: number;
}

/**
 * Copies downloads (all of them, or one course's) into a folder people pick,
 * as `learnX/<semester>/<course>/<title>.<ext>` in the app's language. A file
 * exported before is overwritten, so exporting again brings the folder up to
 * date. Resolves to null when the picker is cancelled.
 */
export const exportDownloads = async (
  courseId?: string,
): Promise<ExportResult | null> => {
  let picked: Directory;
  try {
    picked = await Directory.pickDirectoryAsync();
  } catch (e) {
    if (/cancel/i.test((e as Error).message)) {
      return null;
    }
    throw e;
  }

  const root = childDirectory(picked, EXPORT_DIR);
  const result: ExportResult = { exported: 0, failed: 0 };
  // Names taken in each folder, since two courses can share a name.
  const takenByFolder = new Map<string, Set<string>>();

  const courses = subdirectories(getDownloadsDirectory())
    .filter(course => !courseId || course.name === courseId)
    .sort(byName);
  for (const course of courses) {
    const files = filesOf(course);
    if (files.length === 0) {
      continue;
    }
    const info = readCourseInfo(course);
    const folders = [
      ...(info.semesterId ? [getSemesterTextFromId(info.semesterId)] : []),
      courseNameOf(course, info),
    ].map(name => sanitizeFileName(name));

    let dir = root;
    for (const folder of folders) {
      dir = childDirectory(dir, folder);
    }
    const key = folders.join('/');
    const taken = takenByFolder.get(key) ?? new Set<string>();
    takenByFolder.set(key, taken);
    const existing = new Map(dir.list().map(entry => [entry.name, entry]));

    for (const file of files) {
      const name = uniqueName(file.name, taken);
      try {
        const old = existing.get(name);
        const target =
          old instanceof File
            ? old
            : dir.createFile(
                name,
                mime.getType(name) ?? 'application/octet-stream',
              );
        await file.copy(target, { overwrite: true });
        result.exported++;
      } catch {
        result.failed++;
      }
    }
  }
  return result;
};
