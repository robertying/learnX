import { Language } from '@robertying/thu-learn-lib';
import dayjs from 'dayjs';
import type { Assignment, Course, File, Notice } from 'data/types/state';

type MockData = typeof import('data/mock');

/**
 * How much the emulated server holds for the mock account: `normal` is
 * `data/mock.ts` as written, `large` adds courses and items up to a busy
 * real-world semester, for performance runs (the `mockScale` launch
 * argument). The App Review account's own data never changes.
 */
export type MockScale = 'normal' | 'large';

/** The large semester's totals, the written mock data included. */
export const largeMockSize = {
  courses: 12,
  notices: 400,
  assignments: 150,
  files: 600,
};

/**
 * The same numbers every run, so runs compare (Park and Miller's generator,
 * exact in doubles).
 */
const random = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

/** Courses the large semester adds, in both languages. */
const extraCourses = [
  {
    id: '151001250',
    chineseName: '随机信号分析',
    englishName: 'Random Signal Analysis',
    teacher: { zh: '彭知远', en: 'Zhiyuan Peng' },
    courseNumber: '40230512',
    timeAndLocation: ['星期一第4节(全周)，六教6A015'],
  },
  {
    id: '151001363',
    chineseName: '电磁场与波',
    englishName: 'Electromagnetic Fields and Waves',
    teacher: { zh: '沈若川', en: 'Ruochuan Shen' },
    courseNumber: '40230622',
    timeAndLocation: ['星期二第5节(全周)，四教4201'],
  },
];

const minutes = 60 * 1000;
const days = 24 * 60 * minutes;

/** `iso` moved by `ms`, kept in the form it was written in. */
const shifted = (iso: string | undefined, ms: number, utc: boolean) => {
  if (!iso) {
    return iso;
  }
  const moved = dayjs(iso).add(ms, 'ms');
  return utc ? moved.toISOString() : moved.format();
};

/**
 * `data/mock.ts` (in `language`) grown to `largeMockSize`: the written items
 * stay as they are, so the E2E flows still find theirs, and the rest are
 * copies of them, spread over the visible courses of the current semester and
 * its eight weeks so far. A copy has a new id, a numbered title, its own times
 * (moved together, so a submitted assignment stays submitted before its
 * deadline) and, for a notice, a longer body made of several written ones.
 */
export const largeMock = (base: MockData, language: Language): MockData => {
  const next = random(20261120);
  const pick = <T>(items: T[]) => items[Math.floor(next() * items.length)];
  const english = language === Language.EN;
  const numbered = (title: string, n: number) =>
    english ? `${title} (${n})` : `${title}（${n}）`;
  const now = Date.now();

  const added: Course[] = extraCourses.map(c => ({
    semesterId: base.mockCurrentSemester,
    id: `${base.mockCurrentSemester}${c.id}`,
    // As the written courses: the emulated server renames them per request.
    name: c.chineseName,
    chineseName: c.chineseName,
    englishName: c.englishName,
    teacherName: english ? c.teacher.en : c.teacher.zh,
    teacherNumber: `20${c.courseNumber.slice(2)}12`,
    courseNumber: c.courseNumber,
    courseIndex: 0,
    timeAndLocation: c.timeAndLocation,
  }));
  const hidden = new Set(base.mockUserData.hiddenCourses);
  const courses = [
    ...base.mockCourses.filter(
      c => c.semesterId === base.mockCurrentSemester && !hidden.has(c.id),
    ),
    ...added,
  ].slice(0, largeMockSize.courses);
  const current = new Set(
    base.mockCourses
      .filter(c => c.semesterId === base.mockCurrentSemester)
      .map(c => c.id),
  );
  const inCurrent = <T extends { courseId: string }>(items: T[]) =>
    items.filter(item => current.has(item.courseId));

  /** The fields every item takes from its course. */
  const of = (c: Course) => ({
    courseId: c.id,
    courseName: c.name,
    courseTeacherName: c.teacherName,
  });
  /** Somewhere in the semester so far, `recent` days at most. */
  const ago = (recent = 56) =>
    dayjs(now - Math.floor(next() * recent * 24 * 60) * minutes)
      .second(0)
      .millisecond(0)
      .format();
  const copyCount = (total: number, written: unknown[]) =>
    Math.max(0, total - written.length);
  const withId = <T extends { id: string }>(file: T | undefined, n: number) =>
    file && { ...file, id: `${file.id}-${n}` };

  const noticeSources = inCurrent(base.mockNotices);
  const notices: Notice[] = Array.from(
    { length: copyCount(largeMockSize.notices, base.mockNotices) },
    (_, i) => {
      const n = 1001 + i;
      const source = pick(noticeSources);
      const publishTime = ago();
      const fresh = now - dayjs(publishTime).valueOf() < 3 * days;
      // Two to six written bodies, so bodies are as long as real ones.
      const content = Array.from(
        { length: 2 + Math.floor(next() * 5) },
        (__, k) => (k === 0 ? source : pick(noticeSources)).content,
      ).join('');
      return {
        ...source,
        ...of(pick(courses)),
        id: base.noticeId(n),
        url: source.url.replace(source.id, base.noticeId(n)),
        title: numbered(source.title, n),
        publishTime,
        hasRead: fresh ? next() < 0.5 : next() < 0.9,
        markedImportant: next() < 0.05,
        content,
        attachment: withId(source.attachment, n),
      };
    },
  );

  const assignmentSources = inCurrent(base.mockAssignments);
  const assignments: Assignment[] = Array.from(
    { length: copyCount(largeMockSize.assignments, base.mockAssignments) },
    (_, i) => {
      const n = 1001 + i;
      const { excellentHomeworkList: _excellent, ...source } =
        pick(assignmentSources);
      // A submitted copy moves only earlier, so it wasn't submitted or
      // graded in the future; an open one can become overdue.
      const move = Math.round(
        (source.submitted ? -next() * 35 : -21 + next() * 42) * days,
      );
      return {
        ...source,
        ...of(pick(courses)),
        id: base.assignmentId(n),
        url: source.url.replace(source.id, base.assignmentId(n)),
        title: numbered(source.title, n),
        deadline: shifted(source.deadline, move, true)!,
        lateSubmissionDeadline: shifted(
          source.lateSubmissionDeadline,
          move,
          true,
        ),
        submitTime: shifted(source.submitTime, move, true),
        gradeTime: shifted(source.gradeTime, move, true),
        attachment: withId(source.attachment, n),
        submittedAttachment: withId(source.submittedAttachment, n),
        gradeAttachment: withId(source.gradeAttachment, n),
        answerAttachment: withId(source.answerAttachment, n),
      };
    },
  );

  const fileSources = inCurrent(base.mockFiles);
  const files: File[] = Array.from(
    { length: copyCount(largeMockSize.files, base.mockFiles) },
    (_, i) => {
      const n = 1001 + i;
      const source = pick(fileSources);
      const course = pick(courses);
      const uploadTime = ago();
      const fresh = now - dayjs(uploadTime).valueOf() < 3 * days;
      return {
        ...source,
        ...of(course),
        id: base.fileId(n),
        title: numbered(source.title, n),
        uploadTime,
        isNew: fresh && next() < 0.6,
        markedImportant: next() < 0.05,
        ...(source.category && {
          category: {
            ...source.category,
            id: `${course.id}-${source.category.title}`,
          },
        }),
      };
    },
  );

  return {
    ...base,
    mockCourses: [...base.mockCourses, ...added],
    mockNotices: [...base.mockNotices, ...notices],
    mockAssignments: [...base.mockAssignments, ...assignments],
    mockFiles: [...base.mockFiles, ...files],
  };
};
