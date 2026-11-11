import dayjs from 'dayjs';
import { ContentDiff } from 'data/contentDiff';
import { BookmarkType } from 'data/userData';
import { Assignment, NotificationSettings } from 'data/types/state';
import { deadlineDayTime } from 'helpers/assignments';
import { getAssignmentGradeLevelDescription, t } from 'helpers/i18n';
import { ItemTarget } from 'helpers/openTarget';
import { capitalize, removeTags } from 'helpers/text';

/** Items older than this aren't news, e.g. when an old course comes back. */
const RECENT_DAYS = 7;

/** At most this many notifications per sync; the rest are folded in. */
const MAX_NOTIFICATIONS = 8;

export type ContentKind =
  | 'notices'
  | 'files'
  | 'assignments'
  | 'grades'
  | 'comments'
  | 'deadlineChanges'
  | 'groupSubmissions';

/** One item that a sync found and the user wants to hear about. */
export interface ContentItem {
  kind: ContentKind;
  /** Remembered once notified, so the same news isn't posted twice. */
  key: string;
  courseId: string;
  courseName: string;
  /** The item's own name, the title of a notification about it alone. */
  title: string;
  /** What happened to it, the body of a notification about it alone. */
  detail: string;
  /** Its line in a notification listing several of its kind. */
  line: string;
  target: Required<ItemTarget>;
}

/**
 * One notification. The title names what it's about (the item, or how many
 * there are), the subtitle the course, and the body what happened, as in Mail
 * and Calendar.
 */
export interface ContentNotification {
  title: string;
  subtitle?: string;
  body: string;
  /** Groups a course's notifications in the notification center. */
  threadId?: string;
  /** What it's about; the summary of several courses has none. */
  kind?: ContentKind;
  target: ItemTarget;
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

/** A notification's title for `count` items of a kind. */
const countTitles: Record<ContentKind, (count: number) => string> = {
  notices: count => t('notifyNoticeCount', { count }),
  files: count => t('notifyFileCount', { count }),
  assignments: count => t('notifyAssignmentCount', { count }),
  grades: count => t('notifyGradeCount', { count }),
  comments: count => t('notifyCommentCount', { count }),
  deadlineChanges: count => t('notifyDeadlineChangeCount', { count }),
  groupSubmissions: count => t('notifyGroupSubmittedCount', { count }),
};

const kindLabels: Record<ContentKind, () => string> = {
  notices: () => t('notifyNewNotices'),
  files: () => t('notifyNewFiles'),
  assignments: () => t('notifyNewAssignments'),
  grades: () => t('notifyGrades'),
  comments: () => t('notifyComments'),
  deadlineChanges: () => t('notifyDeadlineChanges'),
  groupSubmissions: () => t('notifyGroupSubmissions'),
};

const targetTypes: Record<ContentKind, ItemTarget['type']> = {
  notices: 'notice',
  files: 'file',
  assignments: 'assignment',
  grades: 'assignment',
  comments: 'assignment',
  deadlineChanges: 'assignment',
  groupSubmissions: 'assignment',
};

const formatTime = (time: string) =>
  dayjs(time).format(t('shortDateTimeFormat'));

/** About two lines of a notice, as a preview. */
const PREVIEW_LENGTH = 120;
const preview = (html?: string) => {
  const text = removeTags(html);
  return text.length > PREVIEW_LENGTH
    ? `${text.slice(0, PREVIEW_LENGTH).trimEnd()}…`
    : text;
};

const joined = (...parts: (string | null | undefined)[]) =>
  parts.filter(Boolean).join(' · ');

/** A short, stable stand-in for a text in a key. */
const hash = (text: string) => {
  let h = 7;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) % 2147483647;
  }
  return h.toString(36);
};

/**
 * The key of a group assignment's submission. Submitting from this device
 * adds it to the notified keys, so only someone else's submission is news.
 */
export const groupSubmittedKey = (assignmentId: string) =>
  `group-submitted:${assignmentId}`;

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
        add({
          ...base('notices', n),
          key: `notice:${n.id}`,
          title: n.title,
          detail: preview(n.content) || t('notifyNewNotice'),
          line: n.title,
        });
      }
    }
  }
  if (settings.files) {
    for (const f of diff.files.added) {
      if (recent(f.uploadTime)) {
        add({
          ...base('files', f),
          key: `file:${f.id}`,
          title: f.title,
          detail: joined(t('notifyNewFile'), f.fileType?.toUpperCase(), f.size),
          line: f.title,
        });
      }
    }
  }
  if (settings.assignments) {
    // Assignments have no publish time; one still open is news.
    for (const a of diff.assignments.added) {
      if (!a.submitted && upcoming(a.deadline)) {
        const due = capitalize(deadlineDayTime(a.deadline, now));
        add({
          ...base('assignments', a),
          key: `assignment:${a.id}`,
          title: a.title,
          detail: joined(t('notifyNewAssignment'), due),
          line: joined(a.title, due),
        });
      }
    }
  }
  if (settings.grades) {
    for (const { after: a } of diff.assignments.graded) {
      const grade = gradeText(a);
      const graded = grade
        ? t('notifyGraded', { grade })
        : t('notifyGradedNoGrade');
      add({
        ...base('grades', a),
        key: `graded:${a.id}:${a.grade ?? ''}:${a.gradeLevel ?? ''}`,
        title: a.title,
        detail: joined(graded, preview(a.gradeContent)),
        line: joined(a.title, graded),
      });
    }
    for (const { after: a } of diff.assignments.commented) {
      const comment = preview(a.gradeContent);
      add({
        ...base('comments', a),
        key: `comment:${a.id}:${hash(comment)}`,
        title: a.title,
        detail: t('notifyNewComment', { comment }),
        line: joined(a.title, t('notifyNewCommentShort')),
      });
    }
  }
  if (settings.deadlineChanges) {
    for (const { before, after: a } of diff.assignments.deadlineChanged) {
      if (!a.submitted && upcoming(a.lateSubmissionDeadline ?? a.deadline)) {
        add({
          ...base('deadlineChanges', a),
          key: `deadline:${a.id}:${a.deadline}:${a.lateSubmissionDeadline ?? ''}`,
          title: a.title,
          detail: t('notifyDeadlineMoved', {
            date: formatTime(a.deadline),
            before: formatTime(before.deadline),
          }),
          line: `${a.title} → ${formatTime(a.deadline)}`,
        });
      }
    }
  }
  if (settings.groupSubmissions) {
    for (const { after: a } of diff.assignments.groupSubmitted) {
      add({
        ...base('groupSubmissions', a),
        key: groupSubmittedKey(a.id),
        title: a.title,
        detail: t('notifyGroupSubmitted'),
        line: a.title,
      });
    }
  }
  return items;
};

/**
 * One notification per course and kind: a single item names itself and says
 * what happened, and opens itself; several are counted ("3 New Files") and
 * listed, and open their list.
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
    const single = group.length === 1;
    return {
      kind: first.kind,
      title: single ? first.title : countTitles[first.kind](group.length),
      subtitle: first.courseName,
      body: single ? first.detail : group.map(i => i.line).join('\n'),
      threadId: first.courseId,
      target: single ? first.target : { type: first.target.type },
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
      title: t('notifySummary', {
        count: rest.reduce((sum, n) => sum + n.keys.length, 0),
        courses: new Set(rest.map(n => n.threadId)).size,
      }),
      body: rest
        .map(n => joined(n.subtitle, n.kind && kindLabels[n.kind]()))
        .join('\n'),
      target: { type: rest[0].target.type },
      keys: rest.flatMap(n => n.keys),
    },
  ];
};
