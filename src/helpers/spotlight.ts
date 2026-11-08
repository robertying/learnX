import dayjs from 'dayjs';
import Spotlight, {
  SpotlightDomain,
  SpotlightItem,
} from '../../modules/spotlight';
import { Assignment, Notice } from 'data/types/state';
import { removeTags } from 'helpers/text';
import type { UpcomingClass } from 'helpers/upNext';
import { upcomingDeadlines } from 'helpers/widgetDeadlines';

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

/** What each domain was last indexed with, so unchanged lists are skipped. */
let indexed: Partial<Record<SpotlightDomain, string>> = {};
/** Index changes run one at a time, as each one deletes, then adds. */
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
  const key = JSON.stringify(items);
  if (indexed[domain] === key) {
    return;
  }
  indexed[domain] = key;
  enqueue(async () => {
    try {
      await Spotlight!.replaceItems(domain, items);
    } catch (error) {
      // Tried again with the next change.
      delete indexed[domain];
      throw error;
    }
  });
};

/**
 * Makes the notices and assignments findable in Spotlight, without hidden
 * courses, and saves the open assignments for the "Next Deadline" App Intent.
 * A list that isn't loaded keeps what was indexed. Resolves once the index is
 * updated; it never rejects.
 */
export async function updateSpotlight(
  { notices, assignments }: { notices?: Notice[]; assignments?: Assignment[] },
  { hiddenCourses, archived }: { hiddenCourses: string[]; archived: string[] },
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
    try {
      Spotlight.setUpcomingDeadlines(
        upcomingDeadlines(assignments, {
          hiddenCourses,
          archived,
          limit: 20,
        }).deadlines,
      );
    } catch (error) {
      if (__DEV__) {
        console.warn('Failed to save upcoming deadlines', error);
      }
    }
  }
  await queue;
}

/** What the "Next Class" App Intent was last given. */
let savedClasses: string | undefined;

/** Saves the classes still ahead for the "Next Class" App Intent. */
export function saveUpcomingClasses(classes: UpcomingClass[]) {
  if (!Spotlight) {
    return;
  }
  const items = classes.map(({ courseName, location, start, end }) => ({
    courseName,
    location,
    start,
    end,
  }));
  const key = JSON.stringify(items);
  if (key === savedClasses) {
    return;
  }
  try {
    Spotlight.setUpcomingClasses?.(items);
    savedClasses = key;
  } catch (error) {
    if (__DEV__) {
      console.warn('Failed to save upcoming classes', error);
    }
  }
}

/** Removes everything from Spotlight and the App Intents, e.g. on logout. */
export function clearSpotlight() {
  if (!Spotlight) {
    return;
  }
  indexed = {};
  try {
    Spotlight.setUpcomingDeadlines([]);
  } catch {}
  saveUpcomingClasses([]);
  enqueue(() => Spotlight!.removeAllItems());
}
