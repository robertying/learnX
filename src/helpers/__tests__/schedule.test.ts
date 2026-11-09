import dayjs from 'dayjs';
import type { Course } from 'data/types/state';
import { beijingTime } from 'helpers/serverTime';
import {
  currentAndNext,
  matchCourse,
  sessionsFromCalendar,
  sessionsFromCourses,
  sessionsOn,
  startOfWeek,
} from 'helpers/schedule';

const course = (
  id: string,
  name: string,
  timeAndLocation: string[],
): Course => ({
  id,
  name,
  chineseName: name,
  englishName: `${name} (en)`,
  teacherName: '',
  teacherNumber: '',
  courseNumber: '',
  courseIndex: 0,
  timeAndLocation,
  semesterId: '2026-2027-1',
});

// A Monday.
const termStart = '2026-09-14';

describe('startOfWeek', () => {
  it('starts weeks on Monday', () => {
    expect(startOfWeek('2026-11-08').format('YYYY-MM-DD')).toBe('2026-11-02');
    expect(startOfWeek('2026-11-09').format('YYYY-MM-DD')).toBe('2026-11-09');
  });
});

describe('sessionsFromCourses', () => {
  const courses = [
    course('a', '微积分', ['星期一第2节(全周)，六教6A414']),
    course('b', '物理', [
      '星期一第1节(1-8周)，四教4101',
      '星期三第3节(单周)，',
    ]),
    course('c', 'English', ['Section 4 of Wed (Week 1-8 ), 一教101']),
  ];

  it('places each meeting on its day and period', () => {
    const sessions = sessionsFromCourses(courses, termStart, '2026-09-14');
    expect(
      sessions.map(s => [s.courseId, dayjs(s.start).format('ddd HH:mm')]),
    ).toEqual([
      ['b', 'Mon 08:00'],
      ['a', 'Mon 09:50'],
      ['b', 'Wed 13:30'],
      ['c', 'Wed 15:20'],
    ]);
    expect(dayjs(sessions[1].end).format('HH:mm')).toBe('12:15');
    expect(sessions[1].location).toBe('六教6A414');
  });

  it('follows the weeks', () => {
    // Week 10: past week 8, and an even week.
    const sessions = sessionsFromCourses(courses, termStart, '2026-11-16');
    expect(sessions.map(s => s.courseId)).toEqual(['a']);
  });

  it('has nothing before the term or without its first day', () => {
    expect(sessionsFromCourses(courses, termStart, '2026-09-07')).toEqual([]);
    expect(sessionsFromCourses(courses, '', '2026-09-14')).toEqual([]);
  });
});

describe('calendar entries', () => {
  const courses = [course('a', '概率论与随机过程（2）', [])];

  it('matches courses by name, ignoring bracket width and spaces', () => {
    expect(matchCourse('概率论与随机过程(2)', courses)?.id).toBe('a');
    expect(matchCourse('线性代数', courses)).toBeUndefined();
  });

  it('turns entries into sessions', () => {
    const sessions = sessionsFromCalendar(
      [
        {
          courseName: '线性代数',
          location: '三教3200',
          date: '2026-11-09',
          startTime: '13:30',
          endTime: '15:05',
        },
        {
          courseName: '概率论与随机过程(2)',
          location: '四教4101',
          date: '2026-11-09',
          startTime: '08:00',
          endTime: '09:35',
        },
      ],
      courses,
    );
    expect(sessions.map(s => [s.courseId, s.courseName])).toEqual([
      ['a', '概率论与随机过程（2）'],
      [undefined, '线性代数'],
    ]);
  });
});

describe('today', () => {
  const sessions = sessionsFromCourses(
    [course('a', 'A', ['星期一第1节(全周)，', '星期一第3节(全周)，'])],
    termStart,
    '2026-09-14',
  );

  it('picks a day', () => {
    expect(
      sessionsOn(sessions, beijingTime('2026-09-14', '12:00')),
    ).toHaveLength(2);
    expect(
      sessionsOn(sessions, beijingTime('2026-09-15', '12:00')),
    ).toHaveLength(0);
  });

  it('finds the class going on and the next one', () => {
    const at = (time: string) => dayjs(`2026-09-14 ${time}`).valueOf();
    expect(currentAndNext(sessions, at('08:30'))).toEqual({
      current: sessions[0],
      next: sessions[1],
    });
    expect(currentAndNext(sessions, at('10:00'))).toEqual({
      current: undefined,
      next: sessions[1],
    });
    expect(currentAndNext(sessions, at('16:00'))).toEqual({
      current: undefined,
      next: undefined,
    });
  });
});

describe('a term that starts on a weekend', () => {
  // fall 2026 starts on Saturday Sep 12; teachers count Nov 4 as week 8
  it('puts week-limited classes in the right weeks', () => {
    const sessions = sessionsFromCourses(
      [course('a', 'A', ['星期一第1节(1周)，'])],
      '2026-09-12',
      '2026-09-14',
    );
    expect(sessions).toHaveLength(1);
  });
});

// jest runs in Asia/Shanghai, so these compare absolute instants (UTC)
describe('on a phone outside UTC+8', () => {
  const sessions = sessionsFromCourses(
    [course('a', 'A', ['星期一第1节(全周)，', '星期一第3节(全周)，'])],
    termStart,
    '2026-09-14',
  );

  it('gives class times as Beijing times', () => {
    expect(new Date(sessions[0].start).toISOString()).toBe(
      '2026-09-14T00:00:00.000Z',
    );
  });

  it("shows Beijing's Monday classes on Sunday evening there", () => {
    // Sunday 21:30 in Los Angeles
    const sundayEvening = Date.parse('2026-09-14T04:30:00Z');
    expect(sessionsOn(sessions, sundayEvening)).toHaveLength(2);
  });

  it('reads registrar dates and times as Beijing times', () => {
    const [session] = sessionsFromCalendar(
      [
        {
          courseName: 'A',
          location: 'room',
          date: '2026-09-14',
          startTime: '08:00',
          endTime: '09:35',
        },
      ],
      [],
    );
    expect(new Date(session.start).toISOString()).toBe(
      '2026-09-14T00:00:00.000Z',
    );
  });
});
