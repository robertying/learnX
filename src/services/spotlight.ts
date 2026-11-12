import dayjs from 'dayjs';
import Spotlight, { SpotlightDomain, SpotlightItem } from 'modules/spotlight';
import { Assignment, File, Notice } from 'data/types/state';
import { removeTags } from 'helpers/text';

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
    file.size,
    removeTags(file.description),
  ),
  keywords: keywords(file.courseName, file.courseTeacherName, file.fileType),
  date: time(file.uploadTime),
});

/**
 * What each domain was last sent with, by item id, so an unchanged list isn't
 * sent again. The module keeps its own record across launches and indexes
 * only what changed.
 */
let sent: Partial<Record<SpotlightDomain, Map<string, string>>> = {};
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

const syncItems = (domain: SpotlightDomain, items: SpotlightItem[]) => {
  const before = sent[domain];
  const after = new Map(items.map(item => [item.id, JSON.stringify(item)]));
  if (
    before &&
    before.size === after.size &&
    [...after].every(([id, item]) => before.get(id) === item)
  ) {
    return;
  }
  sent[domain] = after;
  enqueue(async () => {
    try {
      await Spotlight!.syncItems(domain, items);
    } catch (error) {
      // Sent again with the next update.
      delete sent[domain];
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
    syncItems('notice', shown(notices).map(noticeSpotlightItem));
  }
  if (assignments) {
    syncItems('assignment', shown(assignments).map(assignmentSpotlightItem));
  }
  if (files) {
    syncItems('file', shown(files).map(fileSpotlightItem));
  }
  await queue;
}

/** Removes everything from Spotlight, e.g. on logout. */
export function clearSpotlight() {
  if (!Spotlight) {
    return;
  }
  sent = {};
  enqueue(() => Spotlight!.removeAllItems());
}
