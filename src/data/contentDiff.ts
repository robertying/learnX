import dayjs from 'dayjs';
import { Assignment, File, Notice } from 'data/types/state';

/** An item that is in both lists, as it was and as it is now. */
export interface Change<T> {
  before: T;
  after: T;
}

export interface ListDiff<T> {
  /** In the new list only, in its order. */
  added: T[];
  /** In the old list only, in its order. */
  removed: T[];
  /** In both, where `isChanged` says they differ, in the new list's order. */
  changed: Change<T>[];
}

/** Matches the items of two lists by id. */
export const diffById = <T extends { id: string }>(
  before: readonly T[],
  after: readonly T[],
  isChanged: (before: T, after: T) => boolean,
): ListDiff<T> => {
  const old = new Map(before.map(item => [item.id, item]));
  const ids = new Set(after.map(item => item.id));
  const added: T[] = [];
  const changed: Change<T>[] = [];
  for (const item of after) {
    const previous = old.get(item.id);
    if (!previous) {
      added.push(item);
    } else if (isChanged(previous, item)) {
      changed.push({ before: previous, after: item });
    }
  }
  return {
    added,
    removed: before.filter(item => !ids.has(item.id)),
    changed,
  };
};

/** Compares times by the moment they name, whatever their format. */
const sameTime = (a?: string, b?: string) =>
  a === b || (!!a && !!b && dayjs(a).valueOf() === dayjs(b).valueOf());

/** Graded since, or its grade changed. */
const isNewlyGraded = (before: Assignment, after: Assignment) =>
  after.graded &&
  (!before.graded ||
    before.grade !== after.grade ||
    before.gradeLevel !== after.gradeLevel);

const isDeadlineChanged = (before: Assignment, after: Assignment) =>
  !sameTime(before.deadline, after.deadline) ||
  !sameTime(before.lateSubmissionDeadline, after.lateSubmissionDeadline);

/** What a sync found that the user may want to hear about. */
export interface ContentDiff {
  notices: { added: Notice[] };
  assignments: {
    added: Assignment[];
    graded: Change<Assignment>[];
    deadlineChanged: Change<Assignment>[];
  };
  files: { added: File[] };
}

export interface ContentLists {
  notices?: readonly Notice[];
  assignments?: readonly Assignment[];
  files?: readonly File[];
}

/**
 * Compares a semester's lists before and after a sync. A list that is missing
 * on either side (never fetched, or this fetch failed) has no changes, so the
 * first sync doesn't report everything as new.
 */
export const diffContent = (
  before: ContentLists,
  after: ContentLists,
): ContentDiff => {
  const diff = <T extends { id: string }>(
    a: readonly T[] | undefined,
    b: readonly T[] | undefined,
    isChanged: (before: T, after: T) => boolean = () => false,
  ): ListDiff<T> =>
    a && b
      ? diffById(a, b, isChanged)
      : { added: [], removed: [], changed: [] };

  const assignments = diff(
    before.assignments,
    after.assignments,
    (a, b) => isNewlyGraded(a, b) || isDeadlineChanged(a, b),
  );
  const changes = assignments.changed;

  return {
    notices: { added: diff(before.notices, after.notices).added },
    assignments: {
      added: assignments.added,
      graded: changes.filter(c => isNewlyGraded(c.before, c.after)),
      deadlineChanged: changes.filter(c =>
        isDeadlineChanged(c.before, c.after),
      ),
    },
    files: { added: diff(before.files, after.files).added },
  };
};

export const isContentDiffEmpty = (diff: ContentDiff) =>
  diff.notices.added.length === 0 &&
  diff.assignments.added.length === 0 &&
  diff.assignments.graded.length === 0 &&
  diff.assignments.deadlineChanged.length === 0 &&
  diff.files.added.length === 0;
