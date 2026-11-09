import dayjs from 'dayjs';
import { HomeworkGradeLevel } from '@robertying/thu-learn-lib';
import { ContentDiff } from 'data/contentDiff';
import { defaultSettings } from 'data/settings';
import { mockAssignments, mockFiles, mockNotices } from 'data/mock';
import { Assignment, File, Notice } from 'data/types/state';
import {
  groupContentItems,
  PickContext,
  pickContentItems,
} from 'helpers/contentNotifications';

const now = dayjs('2026-11-08T10:00:00+08:00');
const hoursAgo = (h: number) => now.subtract(h, 'hour').toISOString();
const inHours = (h: number) => now.add(h, 'hour').toISOString();

const notice = (id: string, overrides: Partial<Notice> = {}): Notice => ({
  ...mockNotices[0],
  id,
  title: `Notice ${id}`,
  courseId: 'c1',
  courseName: 'Calculus',
  hasRead: false,
  publishTime: hoursAgo(1),
  ...overrides,
});
const file = (id: string, overrides: Partial<File> = {}): File => ({
  ...mockFiles[0],
  id,
  title: `File ${id}`,
  courseId: 'c1',
  courseName: 'Calculus',
  uploadTime: hoursAgo(1),
  ...overrides,
});
const assignment = (
  id: string,
  overrides: Partial<Assignment> = {},
): Assignment => ({
  ...mockAssignments[0],
  id,
  title: `Assignment ${id}`,
  courseId: 'c1',
  courseName: 'Calculus',
  submitted: false,
  graded: false,
  grade: undefined,
  gradeLevel: undefined,
  deadline: inHours(48),
  lateSubmissionDeadline: undefined,
  ...overrides,
});

const emptyDiff = (): ContentDiff => ({
  notices: { added: [] },
  assignments: { added: [], graded: [], deadlineChanged: [] },
  files: { added: [] },
});

const allOn = {
  ...defaultSettings.notifications,
  notices: true,
  files: true,
  assignments: true,
  grades: true,
  deadlineChanges: true,
};

const context = (overrides: Partial<PickContext> = {}): PickContext => ({
  settings: allOn,
  notified: new Set(),
  hiddenCourses: [],
  archived: { notice: [], assignment: [], file: [] },
  now,
  ...overrides,
});

describe('pickContentItems', () => {
  it('picks nothing while every kind is off', () => {
    const diff = emptyDiff();
    diff.notices.added = [notice('n1')];
    diff.files.added = [file('f1')];
    diff.assignments.added = [assignment('a1')];
    expect(
      pickContentItems(
        diff,
        context({ settings: defaultSettings.notifications }),
      ),
    ).toEqual([]);
  });

  it('picks each kind that is on, with a key per item and state', () => {
    const diff = emptyDiff();
    diff.notices.added = [notice('n1')];
    diff.files.added = [file('f1')];
    diff.assignments.added = [assignment('a1')];
    const graded = assignment('a2', {
      graded: true,
      gradeLevel: HomeworkGradeLevel.A,
    });
    diff.assignments.graded = [{ before: assignment('a2'), after: graded }];
    const moved = assignment('a3', { deadline: inHours(72) });
    diff.assignments.deadlineChanged = [
      { before: assignment('a3'), after: moved },
    ];

    const items = pickContentItems(diff, context());
    expect(items.map(i => [i.kind, i.key, i.target])).toEqual([
      ['notices', 'notice:n1', { type: 'notice', id: 'n1' }],
      ['files', 'file:f1', { type: 'file', id: 'f1' }],
      ['assignments', 'assignment:a1', { type: 'assignment', id: 'a1' }],
      ['grades', 'graded:a2::A', { type: 'assignment', id: 'a2' }],
      [
        'deadlineChanges',
        `deadline:a3:${moved.deadline}:`,
        { type: 'assignment', id: 'a3' },
      ],
    ]);
    expect(items[3].text).toBe('Assignment a2: A');
  });

  it('only picks the kinds that are on', () => {
    const diff = emptyDiff();
    diff.notices.added = [notice('n1')];
    diff.files.added = [file('f1')];
    const items = pickContentItems(
      diff,
      context({ settings: { ...defaultSettings.notifications, files: true } }),
    );
    expect(items.map(i => i.key)).toEqual(['file:f1']);
  });

  it('skips old, read, closed and submitted items', () => {
    const diff = emptyDiff();
    diff.notices.added = [
      notice('old', { publishTime: hoursAgo(24 * 8) }),
      notice('read', { hasRead: true }),
    ];
    diff.files.added = [file('old', { uploadTime: hoursAgo(24 * 30) })];
    diff.assignments.added = [
      assignment('closed', { deadline: hoursAgo(1) }),
      assignment('done', { submitted: true }),
    ];
    diff.assignments.deadlineChanged = [
      {
        before: assignment('past'),
        after: assignment('past', { deadline: hoursAgo(2) }),
      },
    ];
    expect(pickContentItems(diff, context())).toEqual([]);
  });

  it('still tells about a deadline moved into the late submission window', () => {
    const diff = emptyDiff();
    const after = assignment('late', {
      deadline: hoursAgo(2),
      lateSubmissionDeadline: inHours(24),
    });
    diff.assignments.deadlineChanged = [{ before: assignment('late'), after }];
    expect(pickContentItems(diff, context())).toHaveLength(1);
  });

  it('skips hidden courses, archived items and what was notified', () => {
    const diff = emptyDiff();
    diff.notices.added = [
      notice('hidden', { courseId: 'c2' }),
      notice('archived'),
      notice('seen'),
      notice('new'),
    ];
    const items = pickContentItems(
      diff,
      context({
        hiddenCourses: ['c2'],
        archived: { notice: ['archived'], assignment: [], file: [] },
        notified: new Set(['notice:seen']),
      }),
    );
    expect(items.map(i => i.key)).toEqual(['notice:new']);
  });

  it('tells about a grade again when it changes', () => {
    const diff = emptyDiff();
    const after = assignment('a', { graded: true, grade: 95 });
    diff.assignments.graded = [{ before: assignment('a'), after }];
    expect(
      pickContentItems(
        diff,
        context({ notified: new Set(['graded:a:90:']) }),
      ).map(i => i.key),
    ).toEqual(['graded:a:95:']);
  });
});

describe('groupContentItems', () => {
  it('opens a single item, and the list for several in a course', () => {
    const diff = emptyDiff();
    diff.files.added = [file('f1'), file('f2')];
    diff.notices.added = [notice('n1')];
    const notifications = groupContentItems(pickContentItems(diff, context()));
    expect(notifications).toEqual([
      {
        title: 'Calculus · New Notices',
        body: 'Notice n1',
        target: { type: 'notice', id: 'n1' },
        keys: ['notice:n1'],
      },
      {
        title: 'Calculus · New Files',
        body: 'File f1\nFile f2',
        target: { type: 'file' },
        ids: ['f1', 'f2'],
        keys: ['file:f1', 'file:f2'],
      },
    ]);
  });

  it('sums up the rest when many courses change at once', () => {
    const diff = emptyDiff();
    diff.files.added = Array.from({ length: 12 }, (_, i) =>
      file(`f${i}`, { courseId: `c${i}`, courseName: `Course ${i}` }),
    );
    const notifications = groupContentItems(pickContentItems(diff, context()));
    expect(notifications).toHaveLength(8);
    expect(notifications[7]).toMatchObject({
      title: 'learnX',
      target: { type: 'file' },
    });
    expect(notifications.flatMap(n => n.keys)).toHaveLength(12);
  });
});
