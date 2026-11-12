// The class timetable shown on Today: from the registrar's calendar when it
// answers, or worked out from each course's time and location otherwise.
import dayjs, { Dayjs } from 'dayjs';
import {
  CLASS_PERIOD_TIMES,
  parseCourseMeeting,
  semesterWeek,
} from '@robertying/thu-learn-lib';
import type { Course } from 'data/types/state';
import { timeFormat } from './i18n';
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
  /** When it starts and ends, as `ServerTime`s (`2026-11-07T08:00:00+08:00`). */
  start: string;
  end: string;
}

/** The Monday that starts the week of `date`, at midnight. */
export const startOfWeek = (date: dayjs.ConfigType) => {
  const d = dayjs(date).startOf('day');
  return d.subtract((d.day() + 6) % 7, 'day');
};

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
  const termStart = dayjs(semesterStart).format('YYYY-MM-DD');
  const meetings = courses.flatMap(course =>
    (course.timeAndLocation ?? []).flatMap(text => {
      const meeting = parseCourseMeeting(text);
      return meeting ? [{ course, meeting }] : [];
    }),
  );
  const sessions: ClassSession[] = [];
  const first = dayjs(from).startOf('day');
  for (let i = 0; i < days; i++) {
    const day = first.add(i, 'day');
    const week = semesterWeek(termStart, day.format('YYYY-MM-DD'));
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
      const [startTime, endTime] = CLASS_PERIOD_TIMES[meeting.period];
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
        key: `${c.start}:${i}`,
        courseName: course?.name ?? c.courseName,
        courseId: course?.id,
        location: c.location,
        start: Date.parse(c.start),
        end: Date.parse(c.end),
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

const time = (ms: number) => dayjs(ms).format(timeFormat());

/**
 * Time and room on the second line, as Calendar lists events, so the course
 * name gets the row's full width. The room is as the course lists it
 * ("六教6A414"), which students know, not the full building name the
 * calendar export adds for maps.
 */
export const classDetails = (session: ClassSession) =>
  [`${time(session.start)}–${time(session.end)}`, session.location.trim()]
    .filter(Boolean)
    .join(' · ');
