import dayjs from 'dayjs';
import { ContentDiff } from 'data/contentDiff';
import { BookmarkType } from 'data/userData';
import { Assignment, NotificationSettings } from 'data/types/state';
import { getAssignmentGradeLevelDescription, t } from 'helpers/i18n';
import { NotificationTarget } from 'helpers/notifications';

/** Items older than this aren't news, e.g. when an old course comes back. */
const RECENT_DAYS = 7;

/** At most this many notifications per sync; the rest are folded in. */
const MAX_NOTIFICATIONS = 8;

export type ContentKind =
  | 'notices'
  | 'files'
  | 'assignments'
  | 'grades'
  | 'deadlineChanges';

/** One item that a sync found and the user wants to hear about. */
export interface ContentItem {
  kind: ContentKind;
  /** Remembered once notified, so the same news isn't posted twice. */
  key: string;
  courseId: string;
  courseName: string;
  /** The line shown for the item. */
  text: string;
  target: Required<NotificationTarget>;
}

export interface ContentNotification {
  title: string;
  body: string;
  target: NotificationTarget;
  /** Ids of the items it covers when there are several, all of one type. */
  ids?: string[];
  /** Keys of the items it covers. */
  keys: string[];
}

export interface PickContext {
  settings: NotificationSettings;
  /** Keys already notified. */
  notified: Set<string>;
  hiddenCourses: readonly string[];
  archived: Record<BookmarkType, readonly string[]>;
  now?: dayjs.Dayjs;
}

const kindLabels: Record<ContentKind, () => string> = {
  notices: () => t('notifyNewNotices'),
  files: () => t('notifyNewFiles'),
  assignments: () => t('notifyNewAssignments'),
  grades: () => t('notifyGrades'),
  deadlineChanges: () => t('notifyDeadlineChanges'),
};

const targetTypes: Record<ContentKind, NotificationTarget['type']> = {
  notices: 'notice',
  files: 'file',
  assignments: 'assignment',
  grades: 'assignment',
  deadlineChanges: 'assignment',
};

const formatTime = (time: string) =>
  dayjs(time).format(t('shortDateTimeFormat'));

const gradeText = (a: Assignment) => {
  if (a.gradeLevel) {
    return getAssignmentGradeLevelDescription(a.gradeLevel);
  }
  return a.grade !== undefined ? String(a.grade) : '';
};

/**
 * Picks what a sync's diff should tell the user: the kinds they turned on,
 * not in a hidden course or archived, recent, not yet read on the web, and
 * not notified before.
 */
export const pickContentItems = (
  diff: ContentDiff,
  context: PickContext,
): ContentItem[] => {
  const { settings, notified } = context;
  const now = context.now ?? dayjs();
  const recent = (time?: string) =>
    !!time && dayjs(time).isAfter(now.subtract(RECENT_DAYS, 'day'));
  const upcoming = (time?: string) => !!time && dayjs(time).isAfter(now);
  const hidden = new Set(context.hiddenCourses);
  const archived = {
    notice: new Set(context.archived.notice),
    assignment: new Set(context.archived.assignment),
    file: new Set(context.archived.file),
  };

  const items: ContentItem[] = [];
  const add = (item: ContentItem) => {
    if (
      !notified.has(item.key) &&
      !hidden.has(item.courseId) &&
      !archived[item.target.type].has(item.target.id)
    ) {
      items.push(item);
    }
  };
  const base = <T extends { id: string; courseId: string; courseName: string }>(
    kind: ContentKind,
    item: T,
  ) => ({
    kind,
    courseId: item.courseId,
    courseName: item.courseName,
    target: { type: targetTypes[kind], id: item.id },
  });

  if (settings.notices) {
    for (const n of diff.notices.added) {
      if (!n.hasRead && recent(n.publishTime)) {
        add({ ...base('notices', n), key: `notice:${n.id}`, text: n.title });
      }
    }
  }
  if (settings.files) {
    for (const f of diff.files.added) {
      if (recent(f.uploadTime)) {
        add({ ...base('files', f), key: `file:${f.id}`, text: f.title });
      }
    }
  }
  if (settings.assignments) {
    // Assignments have no publish time; one still open is news.
    for (const a of diff.assignments.added) {
      if (!a.submitted && upcoming(a.deadline)) {
        add({
          ...base('assignments', a),
          key: `assignment:${a.id}`,
          text: `${a.title} (${formatTime(a.deadline)})`,
        });
      }
    }
  }
  if (settings.grades) {
    for (const { after: a } of diff.assignments.graded) {
      const grade = gradeText(a);
      add({
        ...base('grades', a),
        key: `graded:${a.id}:${a.grade ?? ''}:${a.gradeLevel ?? ''}`,
        text: grade ? `${a.title}: ${grade}` : a.title,
      });
    }
  }
  if (settings.deadlineChanges) {
    for (const { after: a } of diff.assignments.deadlineChanged) {
      if (!a.submitted && upcoming(a.lateSubmissionDeadline ?? a.deadline)) {
        add({
          ...base('deadlineChanges', a),
          key: `deadline:${a.id}:${a.deadline}:${a.lateSubmissionDeadline ?? ''}`,
          text: `${a.title} → ${formatTime(a.deadline)}`,
        });
      }
    }
  }
  return items;
};

/**
 * One notification per course and kind, e.g. "Calculus · New files" listing
 * the files. A single item opens itself; several open their list.
 */
export const groupContentItems = (
  items: ContentItem[],
): ContentNotification[] => {
  const groups = new Map<string, ContentItem[]>();
  for (const item of items) {
    const key = `${item.kind}:${item.courseId}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  const notifications = [...groups.values()].map(group => {
    const [first] = group;
    return {
      title: `${first.courseName} · ${kindLabels[first.kind]()}`,
      body: group.map(i => i.text).join('\n'),
      target: group.length === 1 ? first.target : { type: first.target.type },
      ids: group.length === 1 ? undefined : group.map(i => i.target.id),
      keys: group.map(i => i.key),
    };
  });

  if (notifications.length <= MAX_NOTIFICATIONS) {
    return notifications;
  }
  // Too many courses at once: keep the first ones and sum up the rest, which
  // may mix types, so it has no Archive All.
  const kept = notifications.slice(0, MAX_NOTIFICATIONS - 1);
  const rest = notifications.slice(MAX_NOTIFICATIONS - 1);
  return [
    ...kept,
    {
      title: 'learnX',
      body: rest.map(n => n.title).join('\n'),
      target: { type: rest[0].target.type },
      keys: rest.flatMap(n => n.keys),
    },
  ];
};
