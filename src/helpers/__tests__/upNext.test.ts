import { ClassSession } from 'helpers/schedule';
import { upcomingClasses, upNextTimes } from 'helpers/upNext';

const at = (time: string) => new Date(`2026-11-09T${time}:00+08:00`).getTime();

const session = (
  courseName: string,
  start: string,
  end: string,
  key = `${courseName}:${start}`,
): ClassSession => ({
  key,
  courseName,
  courseId: courseName.toLowerCase(),
  location: '六教6A414',
  start: at(start),
  end: at(end),
});

describe('upcomingClasses', () => {
  const sessions = [
    session('Physics', '13:30', '15:05'),
    session('Calculus', '08:00', '09:35'),
    session('Algebra', '09:50', '12:15'),
  ];

  it('keeps the class going on and the ones after it, earliest first', () => {
    expect(
      upcomingClasses(sessions, { now: at('10:00') }).map(c => c.courseName),
    ).toEqual(['Algebra', 'Physics']);
  });

  it('drops a class once it has ended', () => {
    expect(
      upcomingClasses(sessions, { now: at('12:15') }).map(c => c.courseName),
    ).toEqual(['Physics']);
  });

  it('lists a class from overlapping weeks once', () => {
    const again = session('Physics', '13:30', '15:05', 'other-key');
    expect(
      upcomingClasses([...sessions, again], { now: at('07:00') }),
    ).toHaveLength(3);
  });

  it('keeps only plain values', () => {
    expect(upcomingClasses(sessions, { now: at('15:00') })).toEqual([
      {
        key: 'Physics:13:30',
        courseName: 'Physics',
        courseId: 'physics',
        location: '六教6A414',
        start: at('13:30'),
        end: at('15:05'),
      },
    ]);
  });
});

describe('upNextTimes', () => {
  it('changes now, at each start and end, and at each deadline', () => {
    const classes = [
      { start: at('09:50'), end: at('12:15') },
      { start: at('13:30'), end: at('15:05') },
    ];
    expect(upNextTimes(classes, [at('12:00')], { now: at('10:00') })).toEqual([
      at('10:00'),
      at('12:00'),
      at('12:15'),
      at('13:30'),
      at('15:05'),
    ]);
  });

  it('skips past times and caps the count', () => {
    const classes = [{ start: at('08:00'), end: at('09:35') }];
    expect(upNextTimes(classes, [], { now: at('09:00') })).toEqual([
      at('09:00'),
      at('09:35'),
    ]);
    expect(
      upNextTimes(classes, [at('10:00'), at('11:00')], {
        now: at('07:00'),
        max: 3,
      }),
    ).toEqual([at('07:00'), at('08:00'), at('09:35')]);
  });
});
