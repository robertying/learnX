import { displayFileSize } from 'helpers/filename';
import dayjs from 'dayjs';
import Spotlight, { SpotlightDomain, SpotlightItem } from 'modules/spotlight';
import { Assignment, File, Notice } from 'data/types/state';
import Storage from 'expo-sqlite/kv-store';
import { hash, removeTags } from 'helpers/text';

/** Spotlight shows two or three lines; the rest is only searched. */
const MAX_DETAILS_LENGTH = 500;

const time = (date: string | number | Date | undefined) => {
  const value = date === undefined ? NaN : dayjs(date).valueOf();
  return Number.isNaN(value) ? undefined : value;
};

const details = (...parts: (string | undefined)[]) =>
  parts.filter(Boolean).join(' · ').slice(0, MAX_DETAILS_LENGTH);

const keywords = (...words: (string | undefined)[]) =>
  words.filter((word): word is string => !!word);

export const noticeSpotlightItem = (notice: Notice): SpotlightItem => ({
  id: notice.id,
  title: notice.title,
  details: details(notice.courseName, removeTags(notice.content)),
  keywords: keywords(
    notice.courseName,
    notice.courseTeacherName,
    notice.publisher,
  ),
  date: time(notice.publishTime),
});

export const assignmentSpotlightItem = (
  assignment: Assignment,
): SpotlightItem => ({
  id: assignment.id,
  title: assignment.title,
  details: details(assignment.courseName, removeTags(assignment.description)),
  keywords: keywords(assignment.courseName, assignment.courseTeacherName),
  dueDate: time(assignment.deadline),
});

export const fileSpotlightItem = (file: File): SpotlightItem => ({
  id: file.id,
  title: file.title,
  details: details(
    file.courseName,
    file.fileType.toUpperCase(),
    displayFileSize(file.size),
    removeTags(file.description),
  ),
  keywords: keywords(file.courseName, file.courseTeacherName, file.fileType),
  date: time(file.uploadTime),
});

/** A hash of each indexed item, by domain and item id. */
type Indexed = Partial<Record<SpotlightDomain, Record<string, string>>>;

export const SPOTLIGHT_INDEXED_KEY = 'spotlightIndexed';

const readSaved = (): Indexed => {
  try {
    const saved = Storage.getItemSync(SPOTLIGHT_INDEXED_KEY);
    return saved ? (JSON.parse(saved) as Indexed) : {};
  } catch {
    return {};
  }
};

/**
 * What the index holds: each domain's items, as of the last write that
 * finished, saved so a new JS runtime (an app launch, the background task)
 * sends only what changed instead of indexing everything again.
 */
let saved: Indexed | undefined;
/** What the queued writes will make it: compared with the next update. */
let indexed: Indexed | undefined;

const getIndexed = () => {
  saved ??= readSaved();
  indexed ??= { ...saved };
  return indexed;
};

const save = (
  domain: SpotlightDomain,
  items: Record<string, string> | undefined,
) => {
  const next = { ...(saved ??= readSaved()) };
  if (items) {
    next[domain] = items;
  } else {
    delete next[domain];
  }
  saved = next;
  try {
    Storage.setItemSync(SPOTLIGHT_INDEXED_KEY, JSON.stringify(next));
  } catch {}
};

const forgetSaved = () => {
  saved = {};
  try {
    Storage.removeItemSync(SPOTLIGHT_INDEXED_KEY);
  } catch {}
};

/** Index changes run one at a time, in order. */
let queue = Promise.resolve();

const enqueue = (work: () => Promise<void>) => {
  queue = queue.then(work).catch(error => {
    // Search results that can't update shouldn't break a refresh or the sync.
    if (__DEV__) {
      console.warn('Failed to update Spotlight', error);
    }
  });
};

const replaceItems = (domain: SpotlightDomain, items: SpotlightItem[]) => {
  const all = getIndexed();
  const before = all[domain];
  const after = Object.fromEntries(
    items.map(item => [item.id, hash(JSON.stringify(item))]),
  );
  const changed = items.filter(item => before?.[item.id] !== after[item.id]);
  const removed = before
    ? Object.keys(before).filter(id => !Object.hasOwn(after, id))
    : [];
  if (before && changed.length === 0 && removed.length === 0) {
    return;
  }
  all[domain] = after;
  enqueue(async () => {
    try {
      await (before
        ? Spotlight!.updateItems(domain, changed, removed)
        : Spotlight!.replaceItems(domain, items));
      save(domain, after);
    } catch (error) {
      // The next change replaces the whole domain.
      delete getIndexed()[domain];
      save(domain, undefined);
      throw error;
    }
  });
};

/**
 * Makes the notices, assignments and files findable in Spotlight, without hidden
 * courses. A list that isn't loaded keeps what was indexed. Resolves once the
 * index is updated; it never rejects.
 */
export async function updateSpotlight(
  {
    notices,
    assignments,
    files,
  }: { notices?: Notice[]; assignments?: Assignment[]; files?: File[] },
  { hiddenCourses }: { hiddenCourses: string[] },
) {
  if (!Spotlight) {
    return;
  }
  const hidden = new Set(hiddenCourses);
  const shown = <T extends { courseId: string }>(items: T[]) =>
    items.filter(item => !hidden.has(item.courseId));

  if (notices) {
    replaceItems('notice', shown(notices).map(noticeSpotlightItem));
  }
  if (assignments) {
    replaceItems('assignment', shown(assignments).map(assignmentSpotlightItem));
  }
  if (files) {
    replaceItems('file', shown(files).map(fileSpotlightItem));
  }
  await queue;
}

/** Removes everything from Spotlight, e.g. on logout. */
export function clearSpotlight() {
  if (!Spotlight) {
    return;
  }
  indexed = {};
  enqueue(async () => {
    // After the writes queued before it, which saved what they indexed.
    forgetSaved();
    await Spotlight!.removeAllItems();
  });
}
