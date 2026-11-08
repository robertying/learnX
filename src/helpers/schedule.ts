// The class timetable shown on Today: from the registrar's calendar when it
// answers, or worked out from each course's time and location otherwise.
import dayjs, { Dayjs } from 'dayjs';
import type { Course } from 'data/types/state';

/** One class meeting. Times are ms since the epoch. */
export interface ClassSession {
  /** Stable within a week, for list keys. */
  key: string;
  courseName: string;
  /** The course it belongs to, when it could be matched. */
  courseId?: string;
  location: string;
  start: number;
  end: number;
}

/** What the registrar's calendar lists for a class (thu-learn-lib's `CalendarEvent`). */
export interface CalendarClass {
  courseName: string;
  location: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm */
  startTime: string;
  endTime: string;
}

/**
 * The start and end of each class period (大节), which is what a course's
 * time and location counts in.
 */
export const PERIOD_TIMES: Record<number, [string, string]> = {
  1: ['08:00', '09:35'],
  2: ['09:50', '12:15'],
  3: ['13:30', '15:05'],
  4: ['15:20', '16:55'],
  5: ['17:05', '18:40'],
  6: ['19:20', '21:45'],
};

/** Weeks in a regular term, for "every week" and the like. */
const TERM_WEEKS = 16;

/** The Monday that starts the week of `date`, at midnight. */
export const startOfWeek = (date: dayjs.ConfigType) => {
  const d = dayjs(date).startOf('day');
  return d.subtract((d.day() + 6) % 7, 'day');
};

/** The teaching week `date` falls in, from 1; 0 or less before the term. */
export const semesterWeek = (
  semesterStart: dayjs.ConfigType,
  date: dayjs.ConfigType,
) =>
  Math.floor(
    startOfWeek(date).diff(startOfWeek(semesterStart), 'day') / 7 + 0.5,
  ) + 1;

/* oxlint-disable learnx/no-han-outside-translations -- server text */
const WEEKDAYS: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  日: 7,
  天: 7,
};

const range = (from: number, to: number, step = 1) => {
  const weeks: number[] = [];
  for (let w = from; w <= to; w += step) {
    weeks.push(w);
  }
  return weeks;
};

/**
 * The weeks a meeting happens in, from the part in parentheses, e.g.
 * `全周`, `1-8周`, `9,11周`, `单周`. `null` means every week, also for
 * text it doesn't know.
 */
export const parseWeeks = (text: string): number[] | null => {
  const spec = text.replace(/\s/g, '');
  switch (spec) {
    case '全周':
      return null;
    case '前八周':
      return range(1, 8);
    case '后八周':
      return range(9, TERM_WEEKS);
    case '单周':
      return range(1, TERM_WEEKS, 2);
    case '双周':
      return range(2, TERM_WEEKS, 2);
  }
  const weeks: number[] = [];
  for (const part of spec
    .replace(/^第/, '')
    .replace(/周$/, '')
    .split(/[,，、]/)) {
    const match = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!match) {
      return null;
    }
    const from = Number(match[1]);
    weeks.push(...range(from, match[2] ? Number(match[2]) : from));
  }
  return weeks;
};

export interface Meeting {
  /** 1 (Monday) to 7 (Sunday) */
  weekday: number;
  period: number;
  weeks: number[] | null;
  location: string;
}

/**
 * Reads one entry of a course's time and location, such as
 * `星期六第1节(9,11周)，六教6A414`. Entries without a day or a known period
 * (`星期第0节(全周)，`) give `null`.
 */
export const parseMeeting = (text: string): Meeting | null => {
  const match = text.match(
    /星期([一二三四五六日天])第(\d+)节\s*[(（]([^)）]*)[)）]\s*[，,]?\s*(.*)$/,
  );
  if (!match) {
    return null;
  }
  const period = Number(match[2]);
  if (!PERIOD_TIMES[period]) {
    return null;
  }
  return {
    weekday: WEEKDAYS[match[1]],
    period,
    weeks: parseWeeks(match[3]),
    location: match[4].trim(),
  };
};
/* oxlint-enable learnx/no-han-outside-translations */

const at = (day: Dayjs, time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  return day.hour(hour).minute(minute).second(0).millisecond(0);
};

const byStart = (a: ClassSession, b: ClassSession) =>
  a.start - b.start || a.courseName.localeCompare(b.courseName);

/**
 * The classes of the `days` days from `from`, worked out from the courses'
 * time and location and the term's first day. Unlike the registrar's
 * calendar, this doesn't know about holidays or moved classes.
 */
export const sessionsFromCourses = (
  courses: Course[],
  semesterStart: string,
  from: dayjs.ConfigType,
  days = 7,
): ClassSession[] => {
  if (!dayjs(semesterStart).isValid()) {
    return [];
  }
  const meetings = courses.flatMap(course =>
    (course.timeAndLocation ?? []).flatMap(text => {
      const meeting = parseMeeting(text);
      return meeting ? [{ course, meeting }] : [];
    }),
  );
  const sessions: ClassSession[] = [];
  const first = dayjs(from).startOf('day');
  for (let i = 0; i < days; i++) {
    const day = first.add(i, 'day');
    const week = semesterWeek(semesterStart, day);
    const weekday = day.day() === 0 ? 7 : day.day();
    if (week < 1) {
      continue;
    }
    for (const { course, meeting } of meetings) {
      if (
        meeting.weekday !== weekday ||
        (meeting.weeks && !meeting.weeks.includes(week))
      ) {
        continue;
      }
      const [startTime, endTime] = PERIOD_TIMES[meeting.period];
      sessions.push({
        key: `${course.id}:${day.format('YYYY-MM-DD')}:${meeting.period}`,
        courseName: course.name,
        courseId: course.id,
        location: meeting.location,
        start: at(day, startTime).valueOf(),
        end: at(day, endTime).valueOf(),
      });
    }
  }
  return sessions.sort(byStart);
};

const normalize = (name: string) =>
  name.replace(/\s/g, '').replace(/（/g, '(').replace(/）/g, ')');

/**
 * The course a calendar entry is for. The calendar only names it (in
 * Chinese), so this compares names.
 */
export const matchCourse = (name: string, courses: Course[]) => {
  const target = normalize(name);
  return courses.find(
    course =>
      normalize(course.chineseName || course.name) === target ||
      normalize(course.name) === target,
  );
};

/** The registrar's calendar entries as sessions, tied to their courses. */
export const sessionsFromCalendar = (
  classes: CalendarClass[],
  courses: Course[],
): ClassSession[] =>
  classes
    .map((c, i) => {
      const course = matchCourse(c.courseName, courses);
      const day = dayjs(c.date);
      return {
        key: `${c.date}:${c.startTime}:${i}`,
        courseName: course?.name ?? c.courseName,
        courseId: course?.id,
        location: c.location,
        start: at(day, c.startTime).valueOf(),
        end: at(day, c.endTime).valueOf(),
      };
    })
    .filter(s => !Number.isNaN(s.start) && !Number.isNaN(s.end))
    .sort(byStart);

/** The sessions on the day of `date`, earliest first. */
export const sessionsOn = (
  sessions: ClassSession[],
  date: dayjs.ConfigType,
) => {
  const day = dayjs(date);
  return sessions.filter(s => dayjs(s.start).isSame(day, 'day'));
};

/** The class going on at `now`, and the next one to start. */
export const currentAndNext = (sessions: ClassSession[], now: number) => ({
  current: sessions.find(s => s.start <= now && now < s.end),
  next: sessions.find(s => s.start > now),
});
