import { Directory, File, Paths } from 'expo-file-system';
import { SUBMISSION_DRAFTS_DIR } from 'data/submissionDrafts';
import { queryClient, restoreQueryCache } from 'data/queryClient';
import {
  DOWNLOADS_DIR,
  SHARED_DIR,
  moveDownload,
  moveDownloadsToCurrentDirectory,
  subdirectories,
} from './downloads';

// Moves downloads kept by 18.0.x and earlier into the current layout. It can
// go once few users still update from those versions.

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
