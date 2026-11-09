import dayjs from 'dayjs';
import Spotlight, {
  SpotlightDomain,
  SpotlightItem,
} from '../../modules/spotlight';
import { Assignment, Notice } from 'data/types/state';
import { removeTags } from 'helpers/text';

/** Spotlight shows two or three lines; the rest is only searched. */
const MAX_DETAILS_LENGTH = 500;

const time = (date: string | number | Date | undefined) => {
  const value = date === undefined ? NaN : dayjs(date).valueOf();
  return Number.isNaN(value) ? undefined : value;
};

const details = (courseName: string, html?: string) =>
  [courseName, removeTags(html)]
    .filter(Boolean)
    .join(' · ')
    .slice(0, MAX_DETAILS_LENGTH);

const keywords = (...words: (string | undefined)[]) =>
  words.filter((word): word is string => !!word);

export const noticeSpotlightItem = (notice: Notice): SpotlightItem => ({
  id: notice.id,
  title: notice.title,
  details: details(notice.courseName, notice.content),
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
  details: details(assignment.courseName, assignment.description),
  keywords: keywords(assignment.courseName, assignment.courseTeacherName),
  dueDate: time(assignment.deadline),
});

/**
 * What each domain was last indexed with, by item id, so only the items that
 * changed are sent. Empty in a new JS runtime, whose first update replaces
 * the domain.
 */
let indexed: Partial<Record<SpotlightDomain, Map<string, string>>> = {};
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
  const before = indexed[domain];
  const after = new Map(items.map(item => [item.id, JSON.stringify(item)]));
  const changed = items.filter(
    item => before?.get(item.id) !== after.get(item.id),
  );
  const removed = before ? [...before.keys()].filter(id => !after.has(id)) : [];
  if (before && changed.length === 0 && removed.length === 0) {
    return;
  }
  indexed[domain] = after;
  enqueue(async () => {
    try {
      // An app built before updateItems replaces the whole domain.
      if (before && Spotlight!.updateItems) {
        await Spotlight!.updateItems(domain, changed, removed);
      } else {
        await Spotlight!.replaceItems(domain, items);
      }
    } catch (error) {
      // The next change replaces the whole domain.
      delete indexed[domain];
      throw error;
    }
  });
};

/**
 * Makes the notices and assignments findable in Spotlight, without hidden
 * courses. A list that isn't loaded keeps what was indexed. Resolves once the
 * index is updated; it never rejects.
 */
export async function updateSpotlight(
  { notices, assignments }: { notices?: Notice[]; assignments?: Assignment[] },
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
  await queue;
}

/** Removes everything from Spotlight, e.g. on logout. */
export function clearSpotlight() {
  if (!Spotlight) {
    return;
  }
  indexed = {};
  enqueue(() => Spotlight!.removeAllItems());
}
