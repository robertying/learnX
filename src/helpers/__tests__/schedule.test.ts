import dayjs from 'dayjs';
import type { Course } from 'data/types/state';
import {
  currentAndNext,
  matchCourse,
  parseMeeting,
  parseWeeks,
  semesterWeek,
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

describe('startOfWeek / semesterWeek', () => {
  it('starts weeks on Monday', () => {
    expect(startOfWeek('2026-11-08').format('YYYY-MM-DD')).toBe('2026-11-02');
    expect(startOfWeek('2026-11-09').format('YYYY-MM-DD')).toBe('2026-11-09');
  });

  it('counts teaching weeks from the first day', () => {
    expect(semesterWeek(termStart, '2026-09-14')).toBe(1);
    expect(semesterWeek(termStart, '2026-09-20')).toBe(1);
    expect(semesterWeek(termStart, '2026-11-09')).toBe(9);
    expect(semesterWeek(termStart, '2026-09-13')).toBe(0);
  });
});

describe('parseWeeks', () => {
  it.each([
    ['全周', null],
    ['1-4周', [1, 2, 3, 4]],
    ['9,11周', [9, 11]],
    ['第1-2,5周', [1, 2, 5]],
    ['前八周', [1, 2, 3, 4, 5, 6, 7, 8]],
    ['单周', [1, 3, 5, 7, 9, 11, 13, 15]],
    ['奇怪', null],
  ])('%s', (text, weeks) => {
    expect(parseWeeks(text)).toEqual(weeks);
  });
});

describe('parseMeeting', () => {
  it('reads the day, period, weeks and place', () => {
    expect(parseMeeting('星期六第1节(9,11周)，六教6A414')).toEqual({
      weekday: 6,
      period: 1,
      weeks: [9, 11],
      location: '六教6A414',
    });
    expect(parseMeeting('星期日第6节（全周），')).toEqual({
      weekday: 7,
      period: 6,
      weeks: null,
      location: '',
    });
  });

  it('skips entries without a day or period', () => {
    expect(parseMeeting('星期第0节(全周)，')).toBeNull();
    expect(parseMeeting('星期一第9节(全周)，')).toBeNull();
    expect(parseMeeting('')).toBeNull();
  });
});

describe('sessionsFromCourses', () => {
  const courses = [
    course('a', '微积分', ['星期一第2节(全周)，六教6A414']),
    course('b', '物理', [
      '星期一第1节(1-8周)，四教4101',
      '星期三第3节(单周)，',
    ]),
  ];

  it('places each meeting on its day and period', () => {
    const sessions = sessionsFromCourses(courses, termStart, '2026-09-14');
    expect(
      sessions.map(s => [s.courseId, dayjs(s.start).format('ddd HH:mm')]),
    ).toEqual([
      ['b', 'Mon 08:00'],
      ['a', 'Mon 09:50'],
      ['b', 'Wed 13:30'],
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
    expect(sessionsOn(sessions, '2026-09-14')).toHaveLength(2);
    expect(sessionsOn(sessions, '2026-09-15')).toHaveLength(0);
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
