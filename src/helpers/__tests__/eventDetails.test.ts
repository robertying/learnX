import dayjs from 'dayjs';
import { AlarmMethod } from 'expo-calendar';
import { defaultSettings } from 'data/settings';
import { Assignment, Course, SettingsState } from 'data/types/state';
import {
  AssignmentEventInput,
  alertBeforeDeadline,
  buildAssignmentEventDetails,
  buildAssignmentEventInputs,
  buildAssignmentReminderDetails,
  buildCourseEventDetails,
  dedupeAndSortICSEvents,
  findSyncedCalendars,
  hash,
  sanitizeLocation,
  toICSEvent,
} from 'helpers/eventDetails';
import { ICSEvent } from 'helpers/ics';

const settingsWith = (
  overrides: Partial<SettingsState> = {},
  alarms: Partial<SettingsState['alarms']> = {},
): SettingsState => ({
  ...defaultSettings,
  ...overrides,
  alarms: { ...defaultSettings.alarms, ...alarms },
});

const input = (
  overrides: Partial<AssignmentEventInput> = {},
): AssignmentEventInput => ({
  assignmentId: 'a1',
  title: 'Homework 1 - Calculus',
  note: 'Read chapter 2',
  startDate: dayjs('2026-03-10T08:00:00+08:00'),
  dueDate: dayjs('2026-03-20T23:59:00+08:00'),
  completed: false,
  ...overrides,
});

describe('sanitizeLocation', () => {
  it('prefixes the full building name when the building is known', () => {
    expect(sanitizeLocation('六教6A017')).toBe('清华大学第六教学楼 六教6A017');
  });

  it('trims and returns unknown locations as they are', () => {
    expect(sanitizeLocation('  某楼101 ')).toBe('某楼101');
    expect(sanitizeLocation('101')).toBe('101');
    expect(sanitizeLocation('')).toBe('');
  });
});

describe('hash', () => {
  it('is stable and hex', () => {
    expect(hash('')).toBe('1505');
    expect(hash('learnX')).toBe(hash('learnX'));
    expect(hash('learnX')).toMatch(/^[0-9a-f]+$/);
    expect(hash('a')).not.toBe(hash('b'));
  });
});

describe('buildCourseEventDetails', () => {
  const event = {
    courseName: 'Calculus',
    date: '2026-03-10',
    startTime: '08:00',
    endTime: '09:35',
    location: '六教6A017',
    status: '',
  };

  it('builds a course event in Beijing time with the mapped location', () => {
    expect(buildCourseEventDetails(event, settingsWith())).toEqual({
      title: 'Calculus',
      startDate: new Date('2026-03-10T08:00:00+08:00'),
      endDate: new Date('2026-03-10T09:35:00+08:00'),
      timeZone: 'Asia/Shanghai',
      location: '清华大学第六教学楼 六教6A017',
      notes: '六教6A017',
      alarms: [],
    });
  });

  it('omits the location when asked to', () => {
    const details = buildCourseEventDetails(
      event,
      settingsWith({ courseEventOmitLocation: true }),
    );
    expect(details.location).toBeUndefined();
    expect(details.notes).toBe('六教6A017');
  });

  it('adds an alarm, 15 minutes before by default', () => {
    expect(
      buildCourseEventDetails(event, settingsWith({}, { courseAlarm: true }))
        .alarms,
    ).toEqual([{ relativeOffset: -15 }]);
    expect(
      buildCourseEventDetails(
        event,
        settingsWith({}, { courseAlarm: true, courseAlarmOffset: 5 }),
      ).alarms,
    ).toEqual([{ relativeOffset: -5 }]);
  });
});

describe('buildAssignmentReminderDetails', () => {
  it('uses the deadline as the due date without an alarm', () => {
    const completionDate = dayjs('2026-03-12T10:00:00+08:00');
    expect(
      buildAssignmentReminderDetails(
        settingsWith(),
        input({ completed: true, completionDate }),
      ),
    ).toEqual({
      title: 'Homework 1 - Calculus',
      startDate: new Date('2026-03-10T08:00:00+08:00'),
      dueDate: new Date('2026-03-20T23:59:00+08:00'),
      timeZone: 'Asia/Shanghai',
      completed: true,
      completionDate: completionDate.toDate(),
      notes: 'Read chapter 2',
    });
  });

  it('moves the due date earlier by the alarm offset, a day by default', () => {
    expect(
      buildAssignmentReminderDetails(
        settingsWith({}, { assignmentReminderAlarm: true }),
        input(),
      ).dueDate,
    ).toEqual(new Date('2026-03-19T23:59:00+08:00'));
    expect(
      buildAssignmentReminderDetails(
        settingsWith(
          {},
          { assignmentReminderAlarm: true, assignmentReminderAlarmOffset: 60 },
        ),
        input(),
      ).dueDate,
    ).toEqual(new Date('2026-03-20T22:59:00+08:00'));
  });
});

describe('buildAssignmentEventDetails', () => {
  it('ends at the deadline and lasts 30 minutes by default', () => {
    expect(buildAssignmentEventDetails(settingsWith(), input())).toEqual({
      title: 'Homework 1 - Calculus',
      startDate: new Date('2026-03-20T23:29:00+08:00'),
      endDate: new Date('2026-03-20T23:59:00+08:00'),
      timeZone: 'Asia/Shanghai',
      notes: 'Read chapter 2',
      alarms: [],
    });
  });

  it('uses the configured event length', () => {
    expect(
      buildAssignmentEventDetails(
        settingsWith({ calendarEventLength: 60 }),
        input(),
      ).startDate,
    ).toEqual(new Date('2026-03-20T22:59:00+08:00'));
  });

  it('marks completed assignments', () => {
    expect(
      buildAssignmentEventDetails(settingsWith(), input({ completed: true }))
        .title,
    ).toBe('✅ Homework 1 - Calculus');
  });

  it('adds the first and second alarms with their defaults', () => {
    const alarms = { assignmentCalendarAlarm: true };
    // Alerts count from the start, half an hour before the deadline.
    expect(
      buildAssignmentEventDetails(settingsWith({}, alarms), input()).alarms,
    ).toEqual([{ relativeOffset: -24 * 60 + 30, method: AlarmMethod.DEFAULT }]);
    expect(
      buildAssignmentEventDetails(
        settingsWith(
          {},
          {
            ...alarms,
            assignmentCalendarAlarmOffset: 120,
            assignmentCalendarSecondAlarm: true,
          },
        ),
        input(),
      ).alarms,
    ).toEqual([
      { relativeOffset: -90, method: AlarmMethod.DEFAULT },
      { relativeOffset: 0, method: AlarmMethod.DEFAULT },
    ]);
  });

  it('times alerts from the deadline whatever the event length', () => {
    const settings = settingsWith(
      { calendarEventLength: 60 },
      {
        assignmentCalendarAlarm: true,
        assignmentCalendarAlarmOffset: 120,
        assignmentCalendarSecondAlarm: true,
        assignmentCalendarSecondAlarmOffset: 15,
      },
    );
    // 15 minutes before the deadline is 45 minutes after the start.
    expect(
      buildAssignmentEventDetails(settings, input()).alarms?.map(
        a => a.relativeOffset,
      ),
    ).toEqual([-60, 45]);
  });

  it('keeps Android alerts at or before the start', () => {
    const { Platform } = require('react-native');
    const os = Platform.OS;
    Platform.OS = 'android';
    try {
      expect(alertBeforeDeadline(15, 60).relativeOffset).toBe(0);
      expect(alertBeforeDeadline(120, 60).relativeOffset).toBe(-60);
    } finally {
      Platform.OS = os;
    }
  });

  it('skips the second alarm without the first', () => {
    expect(
      buildAssignmentEventDetails(
        settingsWith({}, { assignmentCalendarSecondAlarm: true }),
        input(),
      ).alarms,
    ).toEqual([]);
  });

  it('drops alarms for completed assignments when asked to', () => {
    const alarms = {
      assignmentCalendarAlarm: true,
      assignmentCalendarSecondAlarm: true,
      assignmentCalendarNoAlarmIfComplete: true,
    };
    expect(
      buildAssignmentEventDetails(
        settingsWith({}, alarms),
        input({ completed: true }),
      ).alarms,
    ).toEqual([]);
    expect(
      buildAssignmentEventDetails(settingsWith({}, alarms), input()).alarms,
    ).toHaveLength(2);
  });
});

describe('buildAssignmentEventInputs', () => {
  const now = dayjs('2026-03-15T12:00:00+08:00');
  const course = { id: 'c1', name: 'Calculus' } as Course;
  const assignment = (overrides: Partial<Assignment>) =>
    ({
      id: 'a1',
      courseId: 'c1',
      title: 'Homework 1',
      description: '<p>Read <b>chapter 2</b></p>',
      deadline: '2026-03-20T23:59:00+08:00',
      submitted: false,
      ...overrides,
    }) as Assignment;

  it('maps open assignments to event inputs', () => {
    expect(buildAssignmentEventInputs([assignment({})], [course], now)).toEqual(
      [
        {
          assignmentId: 'a1',
          title: 'Homework 1 - Calculus',
          note: 'Read chapter 2',
          startDate: now,
          dueDate: dayjs('2026-03-20T23:59:00+08:00'),
          completed: false,
          completionDate: undefined,
        },
      ],
    );
  });

  it('carries the submit time as the completion date', () => {
    const [result] = buildAssignmentEventInputs(
      [
        assignment({
          submitted: true,
          submitTime: '2026-03-14T09:00:00+08:00',
        }),
      ],
      [course],
      now,
    );
    expect(result.completed).toBe(true);
    expect(result.completionDate?.toISOString()).toBe(
      '2026-03-14T01:00:00.000Z',
    );
  });

  it('skips past deadlines and unknown courses', () => {
    expect(
      buildAssignmentEventInputs(
        [
          assignment({ id: 'past', deadline: '2026-03-15T11:00:00+08:00' }),
          assignment({ id: 'orphan', courseId: 'c2' }),
          assignment({ id: 'kept' }),
        ],
        [course],
        now,
      ).map(i => i.assignmentId),
    ).toEqual(['kept']);
  });
});

describe('findSyncedCalendars', () => {
  it('matches by stored id or by title', () => {
    const calendars = [
      { id: '1', title: 'learnX 课表' },
      { id: '2', title: 'Renamed course calendar' },
      { id: '3', title: 'learnX 作业' },
      { id: '4', title: 'Renamed assignment calendar' },
      { id: '5', title: 'Personal' },
    ];
    const result = findSyncedCalendars(calendars, {
      courseCalendarId: '2',
      assignmentCalendarId: '4',
    });
    expect(result.courseCalendars.map(c => c.id)).toEqual(['1', '2']);
    expect(result.assignmentCalendars.map(c => c.id)).toEqual(['3', '4']);
  });
});

describe('toICSEvent', () => {
  const event = {
    id: 'evt-1',
    title: 'Calculus',
    startDate: '2026-03-10T00:00:00.000Z',
    endDate: new Date('2026-03-10T01:35:00.000Z'),
    allDay: false,
    location: 'Room 101',
    notes: 'Bring notes',
    url: undefined,
    alarms: [{ relativeOffset: -15 }, {}],
  };

  it('keeps assignment event ids as uids', () => {
    expect(toICSEvent(event, false)).toEqual({
      uid: 'evt-1@learnx',
      title: 'Calculus',
      startDate: new Date('2026-03-10T00:00:00.000Z'),
      endDate: new Date('2026-03-10T01:35:00.000Z'),
      allDay: false,
      location: 'Room 101',
      notes: 'Bring notes',
      url: undefined,
      alarmOffsets: [-15],
    });
  });

  it('derives course uids from start time and title', () => {
    const uid = toICSEvent(event, true).uid;
    expect(uid).toBe(
      `course-${Date.parse('2026-03-10T00:00:00.000Z')}-${hash('Calculus')}@learnx`,
    );
    expect(toICSEvent({ ...event, id: 'evt-2' }, true).uid).toBe(uid);
  });
});

describe('dedupeAndSortICSEvents', () => {
  const ics = (uid: string, start: string, title = uid): ICSEvent => ({
    uid,
    title,
    startDate: new Date(start),
    endDate: new Date(start),
  });

  it('keeps the first event per uid and sorts by start', () => {
    expect(
      dedupeAndSortICSEvents([
        ics('b', '2026-03-12T00:00:00Z'),
        ics('a', '2026-03-11T00:00:00Z', 'first'),
        ics('a', '2026-03-11T00:00:00Z', 'second'),
        ics('c', '2026-03-10T00:00:00Z'),
      ]).map(e => e.title),
    ).toEqual(['c', 'first', 'b']);
  });
});
