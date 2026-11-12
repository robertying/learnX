import { HomeworkCompletionType } from '@robertying/thu-learn-lib';
import { Assignment, File, Notice } from 'data/types/state';
import { sameServerTime } from 'helpers/serverTime';

/** An item that is in both lists, as it was and as it is now. */
export interface Change<T> {
  before: T;
  after: T;
}

export interface ListDiff<T> {
  /** In the new list only, in its order. */
  added: T[];
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
  return { added, changed };
};

/** Graded since, or its grade or grade level changed. */
const isNewlyGraded = (before: Assignment, after: Assignment) =>
  after.graded &&
  (!before.graded ||
    before.gradeLevel !== after.gradeLevel ||
    before.grade !== after.grade);

const isDeadlineChanged = (before: Assignment, after: Assignment) =>
  !sameServerTime(before.deadline, after.deadline) ||
  !sameServerTime(before.lateSubmissionDeadline, after.lateSubmissionDeadline);

const commentOf = (a: Assignment) => a.gradeContent?.trim() ?? '';

/**
 * The grader's comment came or changed on an assignment graded before, with
 * the grade the same (a new grade carries its comment).
 */
const isNewlyCommented = (before: Assignment, after: Assignment) =>
  after.graded &&
  before.graded &&
  !!commentOf(after) &&
  commentOf(before) !== commentOf(after) &&
  !isNewlyGraded(before, after);

/**
 * A group assignment became submitted. The server doesn't say by whom; one
 * submitted from this device is remembered when it's sent, so it isn't
 * notified.
 */
const isGroupSubmitted = (before: Assignment, after: Assignment) =>
  after.completionType === HomeworkCompletionType.GROUP &&
  after.submitted &&
  !before.submitted;

/** What a sync found that the user may want to hear about. */
export interface ContentDiff {
  notices: { added: Notice[] };
  assignments: {
    added: Assignment[];
    graded: Change<Assignment>[];
    commented: Change<Assignment>[];
    deadlineChanged: Change<Assignment>[];
    groupSubmitted: Change<Assignment>[];
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
    a && b ? diffById(a, b, isChanged) : { added: [], changed: [] };

  const assignments = diff(
    before.assignments,
    after.assignments,
    (a, b) =>
      isNewlyGraded(a, b) ||
      isNewlyCommented(a, b) ||
      isDeadlineChanged(a, b) ||
      isGroupSubmitted(a, b),
  );
  const changes = assignments.changed;

  return {
    notices: { added: diff(before.notices, after.notices).added },
    assignments: {
      added: assignments.added,
      graded: changes.filter(c => isNewlyGraded(c.before, c.after)),
      commented: changes.filter(c => isNewlyCommented(c.before, c.after)),
      deadlineChanged: changes.filter(c =>
        isDeadlineChanged(c.before, c.after),
      ),
      groupSubmitted: changes.filter(c => isGroupSubmitted(c.before, c.after)),
    },
    files: { added: diff(before.files, after.files).added },
  };
};
