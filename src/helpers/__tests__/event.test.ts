import * as Calendar from 'expo-calendar';
import { getSettings, resetSettings, setSetting } from 'data/settings';
import { Assignment } from 'data/types/state';
import {
  exportSyncedCalendarsToICS,
  getAssignmentCalendarId,
  getAssignmentReminderId,
  getCourseCalendarId,
  removeCalendars,
  saveAssignmentsToReminderOrCalendar,
  saveCoursesToCalendar,
} from 'helpers/event';
import dayjs from 'dayjs';
import { CalendarError } from 'helpers/calendarError';

jest.mock('data/queries', () => ({
  getCachedCourses: () => [{ id: 'c1', name: 'Calculus' }],
}));

const mocked = Calendar as unknown as {
  [K in keyof typeof import('../../../jest/mocks/expoCalendar')]: jest.Mock & {
    get: jest.Mock;
  };
};

const iCloud = { id: 'src-icloud', name: 'iCloud', type: 'caldav' };
const local = { id: 'src-local', name: 'Default', type: 'local' };

const fakeCalendar = (overrides: object = {}) => ({
  listEvents: jest.fn(async () => []),
  createEvent: jest.fn(async () => ({ id: 'new-event' })),
  createReminder: jest.fn(async () => ({ id: 'new-reminder' })),
  ...overrides,
});

const grant = (status = 'granted') => {
  mocked.getCalendarPermissions.mockResolvedValue({ status });
  mocked.requestCalendarPermissions.mockResolvedValue({ status });
  mocked.getRemindersPermissions.mockResolvedValue({ status });
  mocked.requestRemindersPermissions.mockResolvedValue({ status });
};

beforeEach(() => {
  resetSettings();
  grant();
  mocked.getCalendars.mockResolvedValue([]);
  mocked.createCalendar.mockResolvedValue({ id: 'created' });
});

describe('calendar ids', () => {
  it('returns the stored calendar while it exists', async () => {
    setSetting('courseCalendarId', 'stored');
    mocked.getCalendars.mockResolvedValue([{ id: 'stored', title: 'Other' }]);

    await expect(getCourseCalendarId()).resolves.toBe('stored');
    expect(mocked.getCalendars).toHaveBeenCalledWith();
    expect(mocked.createCalendar).not.toHaveBeenCalled();
  });

  it('adopts a calendar with the same title and stores its id', async () => {
    setSetting('courseCalendarId', 'gone');
    mocked.getCalendars.mockResolvedValue([
      { id: 'found', title: 'learnX 课表' },
    ]);

    await expect(getCourseCalendarId()).resolves.toBe('found');
    expect(getSettings().courseCalendarId).toBe('found');
    expect(mocked.createCalendar).not.toHaveBeenCalled();
  });

  it('creates the course calendar on the iCloud source', async () => {
    mocked.getCalendars.mockImplementation(async (type?: string) =>
      type === 'event'
        ? [
            { id: 'x', title: 'Local', source: local },
            { id: 'y', title: 'Home', source: iCloud },
          ]
        : [],
    );

    await expect(getCourseCalendarId()).resolves.toBe('created');
    expect(mocked.createCalendar).toHaveBeenCalledWith({
      title: 'learnX 课表',
      color: expect.any(String),
      entityType: 'event',
      sourceId: 'src-icloud',
      source: iCloud,
      name: 'learnX 课表',
      ownerAccount: 'learnX',
      accessLevel: 'owner',
    });
    expect(getSettings().courseCalendarId).toBe('created');
  });

  it('throws when there is no calendar source', async () => {
    await expect(getCourseCalendarId()).rejects.toThrow(
      new CalendarError('noSource'),
    );
  });

  it('clears synced assignment events before creating their calendar', async () => {
    setSetting('syncedCalendarAssignments', { a1: 'e1' });
    setSetting('syncedReminderAssignments', { a1: 'r1' });
    mocked.getCalendars.mockResolvedValue([
      { id: 'x', title: 'Local', source: local },
    ]);

    await expect(getAssignmentCalendarId()).resolves.toBe('created');
    expect(mocked.getCalendars).toHaveBeenCalledWith('event');
    expect(mocked.createCalendar).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'learnX 作业',
        name: 'learnX 课表',
        entityType: 'event',
        source: local,
      }),
    );
    expect(getSettings().assignmentCalendarId).toBe('created');
    expect(getSettings().syncedCalendarAssignments).toEqual({});
    expect(getSettings().syncedReminderAssignments).toEqual({ a1: 'r1' });
  });

  it('creates the reminder list from reminder sources', async () => {
    setSetting('syncedReminderAssignments', { a1: 'r1' });
    mocked.getCalendars.mockImplementation(async (type?: string) =>
      type === 'reminder'
        ? [{ id: 'r', title: 'Reminders', source: local }]
        : [],
    );

    await expect(getAssignmentReminderId()).resolves.toBe('created');
    expect(mocked.createCalendar).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'learnX 作业',
        name: 'learnX 作业',
        entityType: 'reminder',
        source: local,
      }),
    );
    expect(getSettings().assignmentReminderId).toBe('created');
    expect(getSettings().syncedReminderAssignments).toEqual({});
  });
});

describe('saveCoursesToCalendar', () => {
  it('replaces the events in the range', async () => {
    setSetting('courseCalendarId', 'courses');
    mocked.getCalendars.mockResolvedValue([{ id: 'courses', title: 'x' }]);
    const old = { delete: jest.fn(async () => {}) };
    const calendar = fakeCalendar({
      listEvents: jest.fn(async () => [old]),
    });
    mocked.ExpoCalendar.get.mockResolvedValue(calendar);

    const start = dayjs('2026-03-01');
    const end = dayjs('2026-03-31');
    await saveCoursesToCalendar(
      [
        {
          courseName: 'Calculus',
          date: '2026-03-10',
          startTime: '08:00',
          endTime: '09:35',
          location: '六教6A017',
          status: '',
        },
      ],
      start,
      end,
    );

    expect(mocked.ExpoCalendar.get).toHaveBeenCalledWith('courses');
    expect(calendar.listEvents).toHaveBeenCalledWith(
      start.toDate(),
      end.toDate(),
    );
    expect(old.delete).toHaveBeenCalled();
    expect(calendar.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Calculus',
        location: '清华大学第六教学楼 六教6A017',
      }),
    );
  });

  it("doesn't ask for Reminders", async () => {
    mocked.getRemindersPermissions.mockResolvedValue({ status: 'denied' });
    setSetting('courseCalendarId', 'courses');
    mocked.getCalendars.mockResolvedValue([{ id: 'courses', title: 'x' }]);
    mocked.ExpoCalendar.get.mockResolvedValue(fakeCalendar());
    await saveCoursesToCalendar([], dayjs(), dayjs());
    expect(mocked.requestRemindersPermissions).not.toHaveBeenCalled();
  });

  it('needs calendar permission', async () => {
    grant('denied');
    await expect(saveCoursesToCalendar([], dayjs(), dayjs())).rejects.toThrow(
      new CalendarError('calendarPermission'),
    );
  });
});

describe('saveAssignmentsToReminderOrCalendar', () => {
  const assignment = (id: string) =>
    ({
      id,
      courseId: 'c1',
      title: 'Homework',
      description: '',
      deadline: dayjs().add(1, 'day').toISOString(),
      submitted: false,
    }) as Assignment;

  beforeEach(() => {
    setSetting('assignmentCalendarId', 'assignments');
    setSetting('assignmentReminderId', 'reminders');
    mocked.getCalendars.mockImplementation(async (type?: string) => [
      { id: type === 'reminder' ? 'reminders' : 'assignments', title: 'x' },
    ]);
  });

  it('creates calendar events and remembers their ids', async () => {
    const calendar = fakeCalendar();
    mocked.ExpoCalendar.get.mockResolvedValue(calendar);

    await saveAssignmentsToReminderOrCalendar('calendar', [assignment('a1')]);

    expect(mocked.ExpoCalendar.get).toHaveBeenCalledWith('assignments');
    expect(calendar.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Homework - Calculus' }),
    );
    expect(getSettings().syncedCalendarAssignments).toEqual({
      a1: 'new-event',
    });
  });

  it('updates synced events and forgets ones that are gone', async () => {
    setSetting('syncedCalendarAssignments', { a1: 'e1', a2: 'e2' });
    const calendar = fakeCalendar();
    mocked.ExpoCalendar.get.mockResolvedValue(calendar);
    const update = jest.fn(async () => {});
    mocked.ExpoCalendarEvent.get.mockImplementation(async (id: string) => {
      if (id === 'e1') {
        return { update };
      }
      throw new Error('Not found');
    });

    await saveAssignmentsToReminderOrCalendar('calendar', [
      assignment('a1'),
      assignment('a2'),
    ]);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Homework - Calculus' }),
    );
    expect(calendar.createEvent).not.toHaveBeenCalled();
    expect(getSettings().syncedCalendarAssignments).toEqual({ a1: 'e1' });
  });

  it('creates reminders on iOS', async () => {
    const calendar = fakeCalendar();
    mocked.ExpoCalendar.get.mockResolvedValue(calendar);

    await saveAssignmentsToReminderOrCalendar('reminder', [assignment('a1')]);

    expect(mocked.ExpoCalendar.get).toHaveBeenCalledWith('reminders');
    expect(calendar.createReminder).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Homework - Calculus',
        completed: false,
      }),
    );
    expect(getSettings().syncedReminderAssignments).toEqual({
      a1: 'new-reminder',
    });
  });

  it('deletes and forgets the entries of removed assignments', async () => {
    setSetting('syncedCalendarAssignments', { a1: 'e1', gone: 'e2', a3: 'e3' });
    mocked.ExpoCalendar.get.mockResolvedValue(fakeCalendar());
    const deleted: string[] = [];
    mocked.ExpoCalendarEvent.get.mockImplementation(async (id: string) => {
      if (id === 'e2') {
        throw new Error('Not found');
      }
      return {
        update: jest.fn(async () => {}),
        delete: jest.fn(async () => {
          deleted.push(id);
        }),
      };
    });

    await saveAssignmentsToReminderOrCalendar(
      'calendar',
      [assignment('a1')],
      ['a3', 'gone', 'neverSynced'],
    );

    expect(deleted).toEqual(['e3']);
    expect(getSettings().syncedCalendarAssignments).toEqual({ a1: 'e1' });
  });

  it('needs reminder permission for reminders', async () => {
    mocked.getRemindersPermissions.mockResolvedValue({ status: 'denied' });
    mocked.requestRemindersPermissions.mockResolvedValue({ status: 'denied' });
    await expect(
      saveAssignmentsToReminderOrCalendar('reminder', []),
    ).rejects.toThrow(new CalendarError('reminderPermission'));
  });
});

describe('removeCalendars', () => {
  it('deletes learnX calendars and reminder lists and resets their settings', async () => {
    setSetting('courseCalendarId', 'c');
    setSetting('assignmentCalendarId', 'a');
    setSetting('assignmentReminderId', 'r');
    setSetting('syncedCalendarAssignments', { a1: 'e1' });
    const course = { title: 'learnX 课表', delete: jest.fn(async () => {}) };
    const personal = { title: 'Personal', delete: jest.fn(async () => {}) };
    // Has learnX in its title, but isn't one of ours.
    const notes = { title: 'learnX notes', delete: jest.fn(async () => {}) };
    const adopted = {
      id: 'a',
      title: 'Renamed',
      delete: jest.fn(async () => {}),
    };
    const reminders = {
      title: 'learnX 作业',
      delete: jest.fn(async () => {
        throw new Error('Read-only');
      }),
    };
    mocked.getCalendars.mockImplementation(async (type?: string) =>
      type === 'reminder' ? [reminders] : [course, personal, notes, adopted],
    );

    await removeCalendars();

    expect(notes.delete).not.toHaveBeenCalled();
    expect(adopted.delete).toHaveBeenCalled();
    expect(course.delete).toHaveBeenCalled();
    expect(reminders.delete).toHaveBeenCalled();
    expect(personal.delete).not.toHaveBeenCalled();
    expect(getSettings()).toMatchObject({
      courseCalendarId: undefined,
      assignmentCalendarId: undefined,
      assignmentReminderId: undefined,
      syncedCalendarAssignments: {},
      syncedReminderAssignments: {},
    });
  });
});

describe('exportSyncedCalendarsToICS', () => {
  const event = (id: string, title: string, start: string) => ({
    id,
    title,
    startDate: start,
    endDate: start,
    allDay: false,
    alarms: [],
  });

  it('exports course and assignment events, deduplicated and sorted', async () => {
    const courses = {
      id: 'c',
      title: 'learnX 课表',
      listEvents: jest.fn(async () => [
        event('x1', 'Calculus', '2026-03-12T00:00:00Z'),
        // The same course event again under a new id
        event('x2', 'Calculus', '2026-03-12T00:00:00Z'),
      ]),
    };
    const assignments = {
      id: 'a',
      title: 'learnX 作业',
      listEvents: jest.fn(async () => [
        event('h1', 'Homework', '2026-03-11T00:00:00Z'),
      ]),
    };
    const personal = { id: 'p', title: 'Personal', listEvents: jest.fn() };
    mocked.getCalendars.mockResolvedValue([courses, assignments, personal]);

    const ics = await exportSyncedCalendarsToICS();

    expect(personal.listEvents).not.toHaveBeenCalled();
    expect(ics).toContain('X-WR-CALNAME:learnX');
    const uids = [...ics.matchAll(/^UID:(.*)$/gm)].map(m => m[1].trim());
    expect(uids).toEqual([
      'h1@learnx',
      expect.stringMatching(/^course-\d+-[0-9a-f]+@learnx$/),
    ]);
  });

  it('throws when nothing is synced', async () => {
    await expect(exportSyncedCalendarsToICS()).rejects.toThrow(
      new CalendarError('noEvents'),
    );
  });
});
