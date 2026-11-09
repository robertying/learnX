// The class timetable shown on Today: from the registrar's calendar when it
// answers, or worked out from each course's time and location otherwise.
import dayjs, { Dayjs } from 'dayjs';
import type { Course } from 'data/types/state';
import { beijingDate, beijingTime } from './serverTime';

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

/**
 * The Monday of teaching week 1. The server gives the term's first day, which
 * can be a weekend before classes start (fall 2026 starts on Saturday Sep 12;
 * week 1 is Sep 14–20), so a weekend moves forward to the next Monday and a
 * weekday back to its Monday.
 */
const firstWeekStart = (semesterStart: dayjs.ConfigType) => {
  const day = dayjs(semesterStart).startOf('day');
  const weekday = day.day();
  return weekday === 6 || weekday === 0
    ? day.add(weekday === 6 ? 2 : 1, 'day')
    : startOfWeek(day);
};

/**
 * The teaching week the day `date` falls in, from 1; 0 or less before the
 * term. Both are calendar days (Beijing days for the server's dates).
 */
export const semesterWeek = (
  semesterStart: dayjs.ConfigType,
  date: dayjs.ConfigType,
) =>
  Math.floor(
    startOfWeek(date).diff(firstWeekStart(semesterStart), 'day') / 7 + 0.5,
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

/** English weekday names by their first three letters (`Tues`, `Thur`, …). */
const ENGLISH_WEEKDAYS: Record<string, number> = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
  sun: 7,
};

/** Week specs that aren't a list of weeks, in Chinese and in English. */
const NAMED_WEEKS: Record<string, () => number[] | null> = {
  全周: () => null,
  all: () => null,
  every: () => null,
  full: () => null,
  前八周: () => range(1, 8),
  first8: () => range(1, 8),
  firsteight: () => range(1, 8),
  后八周: () => range(9, TERM_WEEKS),
  last8: () => range(9, TERM_WEEKS),
  lasteight: () => range(9, TERM_WEEKS),
  单周: () => range(1, TERM_WEEKS, 2),
  odd: () => range(1, TERM_WEEKS, 2),
  双周: () => range(2, TERM_WEEKS, 2),
  even: () => range(2, TERM_WEEKS, 2),
};

/**
 * The weeks a meeting happens in, from the part in parentheses, e.g.
 * `全周`, `1-8周`, `9,11周`, `单周`, or in English `Week all`, `Week 1-8`,
 * `Odd weeks`. `null` means every week, also for text it doesn't know.
 */
export const parseWeeks = (text: string): number[] | null => {
  const spec = text
    .replace(/\s/g, '')
    .toLowerCase()
    .replace(/^(?:第|weeks?|wks?)/, '')
    .replace(/(?:周|weeks?|wks?)$/, '');
  const named = NAMED_WEEKS[spec] ?? NAMED_WEEKS[`${spec}周`];
  if (named) {
    return named();
  }
  const weeks: number[] = [];
  for (const part of spec.split(/[,，、;；]/)) {
    const match = part.match(/^(\d+)(?:[-~～–—](\d+))?$/);
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

const toMeeting = (
  weekday: number | undefined,
  period: number,
  weeks: string,
  location: string,
): Meeting | null =>
  weekday && PERIOD_TIMES[period]
    ? { weekday, period, weeks: parseWeeks(weeks), location: location.trim() }
    : null;

/**
 * Reads one entry of a course's time and location, such as
 * `星期六第1节(9,11周)，六教6A414`, or `Section 1 of Sat (Week 9,11 ), 六教6A414`
 * when the website is in English. Entries without a day or a known period
 * (`星期第0节(全周)，`, `Section 0  (Week all ), `) give `null`.
 */
export const parseMeeting = (text: string): Meeting | null => {
  const chinese = text.match(
    /星期([一二三四五六日天])第(\d+)节\s*[(（]([^)）]*)[)）]\s*[，,]?\s*(.*)$/,
  );
  if (chinese) {
    return toMeeting(
      WEEKDAYS[chinese[1]],
      Number(chinese[2]),
      chinese[3],
      chinese[4],
    );
  }
  const english = text.match(
    /section\s*(\d+)\s*(?:of\s*([a-z]+)\.?)?\s*[(（]([^)）]*)[)）]\s*[，,]?\s*(.*)$/i,
  );
  if (english) {
    const day = english[2]?.slice(0, 3).toLowerCase();
    return toMeeting(
      day ? ENGLISH_WEEKDAYS[day] : undefined,
      Number(english[1]),
      english[3],
      english[4],
    );
  }
  return null;
};
/* oxlint-enable learnx/no-han-outside-translations */

/** `time` on the Beijing day `day`, in ms: class times are Beijing times. */
const at = (day: Dayjs | string, time: string) =>
  beijingTime(typeof day === 'string' ? day : day.format('YYYY-MM-DD'), time);

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
        start: at(day, startTime),
        end: at(day, endTime),
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
      return {
        key: `${c.date}:${c.startTime}:${i}`,
        courseName: course?.name ?? c.courseName,
        courseId: course?.id,
        location: c.location,
        start: at(c.date, c.startTime),
        end: at(c.date, c.endTime),
      };
    })
    .filter(s => !Number.isNaN(s.start) && !Number.isNaN(s.end))
    .sort(byStart);

/**
 * The sessions on the Beijing day it is at `time` (ms), earliest first: the
 * timetable follows the school's days, also on a phone in another time zone.
 */
export const sessionsOn = (sessions: ClassSession[], time: number) => {
  const day = beijingDate(time);
  return sessions.filter(s => beijingDate(s.start) === day);
};

/** The class going on at `now`, and the next one to start. */
export const currentAndNext = (sessions: ClassSession[], now: number) => ({
  current: sessions.find(s => s.start <= now && now < s.end),
  next: sessions.find(s => s.start > now),
});
