import * as Calendar from 'expo-calendar';
import { resetSettings, setSetting } from 'data/settings';
import {
  getCalendarSync,
  resetCalendarSync,
  useCalendarSyncStore,
} from 'data/calendarSync';
import { Assignment } from 'data/types/state';
import {
  exportSyncedCalendarsToICS,
  getAssignmentCalendar,
  getAssignmentReminder,
  getCourseCalendar,
  removeCalendars,
  saveAssignmentsToReminderOrCalendar,
} from 'services/calendar/calendars';
import dayjs from 'dayjs';
import { CalendarError } from 'services/calendar/errors';

/** A sync the user started: it may ask for the permission. */
const saveAsUser = (
  type: 'calendar' | 'reminder',
  assignments: Assignment[],
  removed: string[] = [],
) =>
  saveAssignmentsToReminderOrCalendar(type, assignments, removed, {
    ask: true,
  });

jest.mock('data/queries', () => ({
  getCachedCourses: () => [{ id: 'c1', name: 'Calculus' }],
}));

const mocked = Calendar as unknown as {
  [K in keyof typeof import('test-utils/mocks/expoCalendar')]: jest.Mock & {
    get: jest.Mock;
  };
};

const iCloud = { id: 'src-icloud', name: 'iCloud', type: 'caldav' };
const local = { id: 'src-local', name: 'Default', type: 'local' };

const fakeCalendar = (overrides: object = {}) => ({
  listEvents: jest.fn(async (): Promise<object[]> => []),
  listReminders: jest.fn(async (): Promise<object[]> => []),
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
  resetCalendarSync();
  grant();
  mocked.getCalendars.mockResolvedValue([]);
  mocked.createCalendar.mockResolvedValue({ id: 'created' });
});

describe('synced calendars', () => {
  it('returns the stored calendar while it exists', async () => {
    useCalendarSyncStore.setState({ courseCalendarId: 'stored' });
    mocked.getCalendars.mockResolvedValue([{ id: 'stored', title: 'Other' }]);

    await expect(getCourseCalendar()).resolves.toMatchObject({ id: 'stored' });
    expect(mocked.getCalendars).toHaveBeenCalledWith('event');
    expect(mocked.createCalendar).not.toHaveBeenCalled();
  });

  it('adopts a calendar with the same title and stores its id', async () => {
    useCalendarSyncStore.setState({ courseCalendarId: 'gone' });
    mocked.getCalendars.mockResolvedValue([
      { id: 'found', title: 'learnX 课表' },
    ]);

    await expect(getCourseCalendar()).resolves.toMatchObject({ id: 'found' });
    expect(getCalendarSync().courseCalendarId).toBe('found');
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

    await expect(getCourseCalendar()).resolves.toMatchObject({ id: 'created' });
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
    expect(getCalendarSync().courseCalendarId).toBe('created');
  });

  it("creates the course calendar in the default calendar's account", async () => {
    const google = { id: 'src-google', name: 'Google', type: 'caldav' };
    mocked.getDefaultCalendarSync.mockReturnValueOnce({ source: google });
    await getCourseCalendar();
    expect(mocked.createCalendar).toHaveBeenCalledWith(
      expect.objectContaining({ sourceId: 'src-google', source: google }),
    );
    expect(mocked.getCalendars).toHaveBeenCalledTimes(1);
  });

  it('throws when there is no calendar source', async () => {
    await expect(getCourseCalendar()).rejects.toThrow(
      new CalendarError('noSource'),
    );
  });

  it('clears synced assignment events before creating their calendar', async () => {
    useCalendarSyncStore.setState({ syncedCalendarAssignments: { a1: 'e1' } });
    useCalendarSyncStore.setState({ syncedReminderAssignments: { a1: 'r1' } });
    mocked.getCalendars.mockResolvedValue([
      { id: 'x', title: 'Local', source: local },
    ]);

    await expect(getAssignmentCalendar()).resolves.toMatchObject({
      id: 'created',
    });
    expect(mocked.getCalendars).toHaveBeenCalledWith('event');
    expect(mocked.createCalendar).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'learnX 作业',
        name: 'learnX 课表',
        entityType: 'event',
        source: local,
      }),
    );
    expect(getCalendarSync().assignmentCalendarId).toBe('created');
    expect(getCalendarSync().syncedCalendarAssignments).toEqual({});
    expect(getCalendarSync().syncedReminderAssignments).toEqual({ a1: 'r1' });
  });

  it('creates the reminder list from reminder sources', async () => {
    useCalendarSyncStore.setState({ syncedReminderAssignments: { a1: 'r1' } });
    mocked.getCalendars.mockImplementation(async (type?: string) =>
      type === 'reminder'
        ? [{ id: 'r', title: 'Reminders', source: local }]
        : [],
    );

    await expect(getAssignmentReminder()).resolves.toMatchObject({
      id: 'created',
    });
    expect(mocked.createCalendar).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'learnX 作业',
        name: 'learnX 作业',
        entityType: 'reminder',
        source: local,
      }),
    );
    expect(getCalendarSync().assignmentReminderId).toBe('created');
    expect(getCalendarSync().syncedReminderAssignments).toEqual({});
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

  let assignments: ReturnType<typeof fakeCalendar>;
  let reminders: ReturnType<typeof fakeCalendar>;

  beforeEach(() => {
    assignments = fakeCalendar({ id: 'assignments' });
    reminders = fakeCalendar({ id: 'reminders' });
    useCalendarSyncStore.setState({ assignmentCalendarId: 'assignments' });
    useCalendarSyncStore.setState({ assignmentReminderId: 'reminders' });
    mocked.getCalendars.mockImplementation(async (type?: string) => [
      type === 'reminder' ? reminders : assignments,
    ]);
  });

  it('creates calendar events and remembers their ids', async () => {
    const calendar = assignments;

    await saveAsUser('calendar', [assignment('a1')]);

    expect(calendar.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Homework - Calculus' }),
    );
    expect(getCalendarSync().syncedCalendarAssignments).toEqual({
      a1: 'new-event',
    });
  });

  it('updates synced events and makes again the ones deleted in Calendar', async () => {
    useCalendarSyncStore.setState({
      syncedCalendarAssignments: { a1: 'e1', a2: 'e2' },
    });
    const calendar = assignments;
    const update = jest.fn(async () => {});
    mocked.ExpoCalendarEvent.get.mockImplementation(async (id: string) => {
      if (id === 'e1') {
        return { update };
      }
      throw new Error('Not found');
    });

    await saveAsUser('calendar', [assignment('a1'), assignment('a2')]);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Homework - Calculus' }),
    );
    expect(calendar.createEvent).toHaveBeenCalledTimes(1);
    expect(getCalendarSync().syncedCalendarAssignments).toEqual({
      a1: 'e1',
      a2: 'new-event',
    });
  });

  it('takes over matching events when the saved ids are gone', async () => {
    const a1 = assignment('a1');
    const a2 = { ...assignment('a2'), title: 'Lab' };
    const deadline = new Date(a1.deadline);
    // a2's event was taken over before; a1's was written as submitted.
    useCalendarSyncStore.setState({ syncedCalendarAssignments: { a2: 'e2' } });
    mocked.ExpoCalendarEvent.get.mockResolvedValue({
      update: jest.fn(async () => {}),
    });
    assignments.listEvents.mockResolvedValue([
      { id: 'e2', title: 'Homework - Calculus', startDate: deadline },
      { id: 'other', title: 'Homework - Physics', startDate: deadline },
      { id: 'later', title: 'Homework - Calculus', startDate: new Date(0) },
      { id: 'e1', title: '✅ Homework - Calculus', startDate: deadline },
    ]);

    await saveAsUser('calendar', [a1, a2]);

    expect(assignments.createEvent).not.toHaveBeenCalled();
    expect(getCalendarSync().syncedCalendarAssignments).toEqual({
      a1: 'e1',
      a2: 'e2',
    });
  });

  it('takes over a matching reminder due at or before the deadline', async () => {
    const a1 = assignment('a1');
    // Same deadline: each call reads the clock, and 'late' is 1 ms after.
    const a2 = { ...assignment('a2'), deadline: a1.deadline };
    const deadline = new Date(a1.deadline).getTime();
    mocked.ExpoCalendarReminder.get.mockResolvedValue({
      update: jest.fn(async () => {}),
    });
    reminders.listReminders.mockResolvedValue([
      { title: 'Homework - Calculus', dueDate: new Date(deadline) },
      { id: 'late', title: 'Homework - Calculus', dueDate: deadline + 1 },
      {
        id: 'early',
        title: 'Homework - Calculus',
        dueDate: new Date(deadline - 31 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'r1',
        title: 'Homework - Calculus',
        dueDate: new Date(deadline - 24 * 60 * 60 * 1000).toISOString(),
      },
      { id: 'r2', title: 'Homework - Calculus' },
    ]);

    await saveAsUser('reminder', [a1, a2]);

    // a2 matches nothing left, so it gets a new reminder.
    expect(reminders.createReminder).toHaveBeenCalledTimes(1);
    expect(getCalendarSync().syncedReminderAssignments).toEqual({
      a1: 'r1',
      a2: 'new-reminder',
    });
  });

  it("adds events when the calendar can't be listed", async () => {
    assignments.listEvents.mockRejectedValue(new Error('denied'));

    await saveAsUser('calendar', [assignment('a1')]);

    expect(getCalendarSync().syncedCalendarAssignments).toEqual({
      a1: 'new-event',
    });
  });

  it('creates reminders on iOS', async () => {
    const calendar = reminders;

    await saveAsUser('reminder', [assignment('a1')]);

    expect(mocked.getCalendars).toHaveBeenCalledWith('reminder');
    expect(calendar.createReminder).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Homework - Calculus',
        completed: false,
      }),
    );
    expect(getCalendarSync().syncedReminderAssignments).toEqual({
      a1: 'new-reminder',
    });
  });

  it('syncs reminders with only Reminders access', async () => {
    mocked.getCalendarPermissions.mockResolvedValue({ status: 'denied' });
    mocked.requestCalendarPermissions.mockResolvedValue({ status: 'denied' });

    await saveAsUser('reminder', [assignment('a1')]);

    expect(mocked.requestCalendarPermissions).not.toHaveBeenCalled();
    expect(mocked.getCalendars).not.toHaveBeenCalledWith('event');
    expect(mocked.getCalendars).not.toHaveBeenCalledWith();
    expect(reminders.createReminder).toHaveBeenCalled();
  });

  it("doesn't ask for a sync the app starts by itself", async () => {
    mocked.getCalendarPermissions.mockResolvedValue({ status: 'denied' });
    mocked.requestCalendarPermissions.mockResolvedValue({ status: 'granted' });

    await expect(
      saveAssignmentsToReminderOrCalendar('calendar', [assignment('a1')], [], {
        ask: false,
      }),
    ).rejects.toMatchObject({ code: 'calendarPermission' });
    expect(mocked.requestCalendarPermissions).not.toHaveBeenCalled();
  });

  it('deletes and forgets the entries of removed assignments', async () => {
    useCalendarSyncStore.setState({
      syncedCalendarAssignments: { a1: 'e1', gone: 'e2', a3: 'e3' },
    });
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

    await saveAsUser(
      'calendar',
      [assignment('a1')],
      ['a3', 'gone', 'neverSynced'],
    );

    expect(deleted).toEqual(['e3']);
    expect(getCalendarSync().syncedCalendarAssignments).toEqual({ a1: 'e1' });
  });

  it('needs reminder permission for reminders', async () => {
    mocked.getRemindersPermissions.mockResolvedValue({ status: 'denied' });
    mocked.requestRemindersPermissions.mockResolvedValue({ status: 'denied' });
    await expect(saveAsUser('reminder', [])).rejects.toThrow(
      new CalendarError('reminderPermission'),
    );
  });
});

describe('removeCalendars', () => {
  it('deletes learnX calendars and reminder lists and resets their settings', async () => {
    useCalendarSyncStore.setState({ courseCalendarId: 'c' });
    useCalendarSyncStore.setState({ assignmentCalendarId: 'a' });
    useCalendarSyncStore.setState({ assignmentReminderId: 'r' });
    useCalendarSyncStore.setState({ syncedCalendarAssignments: { a1: 'e1' } });
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
    expect(getCalendarSync()).toEqual({
      syncedCalendarAssignments: {},
      syncedReminderAssignments: {},
      writtenClassWeeks: {},
    });
  });
});

describe('removeCalendars and Reminders access', () => {
  const course = () => ({
    id: 'c',
    title: 'x',
    delete: jest.fn(async () => {}),
  });

  it("doesn't ask for Reminders when no list can be there", async () => {
    mocked.getRemindersPermissions.mockResolvedValue({
      status: 'undetermined',
    });
    useCalendarSyncStore.setState({ courseCalendarId: 'c' });
    const calendar = course();
    mocked.getCalendars.mockResolvedValue([calendar]);
    await removeCalendars();
    expect(mocked.requestRemindersPermissions).not.toHaveBeenCalled();
    expect(mocked.getCalendars.mock.calls).toEqual([['event']]);
    expect(calendar.delete).toHaveBeenCalled();
  });

  it('asks for Reminders while Reminders sync is on', async () => {
    mocked.getRemindersPermissions.mockResolvedValue({
      status: 'undetermined',
    });
    mocked.requestRemindersPermissions.mockResolvedValue({ status: 'denied' });
    setSetting('assignmentReminderSync', true);
    await expect(removeCalendars()).rejects.toThrow(
      new CalendarError('reminderPermission'),
    );
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

describe('more of the sync', () => {
  const { Platform } = require('react-native') as typeof import('react-native');

  it('creates the course calendar on its own local account on Android', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    mocked.createCalendar.mockResolvedValue({});
    await getCourseCalendar();
    expect(mocked.createCalendar).toHaveBeenCalledWith(
      expect.objectContaining({
        source: { name: 'learnX', isLocalAccount: true },
      }),
    );
    // No id came back, so none is stored.
    expect(getCalendarSync().courseCalendarId).toBeUndefined();
  });

  describe('reminders on iOS', () => {
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
      useCalendarSyncStore.setState({ assignmentReminderId: 'reminders' });
      mocked.getCalendars.mockResolvedValue([
        fakeCalendar({ id: 'reminders' }),
      ]);
    });

    it('updates a synced reminder, and makes again one deleted in Reminders', async () => {
      useCalendarSyncStore.setState({
        syncedReminderAssignments: { a1: 'r1', a2: 'r2' },
      });
      const update = jest.fn(async () => {});
      mocked.ExpoCalendarReminder.get.mockImplementation(async (id: string) => {
        if (id === 'r2') {
          throw new Error('Not found');
        }
        return { update };
      });
      await saveAsUser('reminder', [assignment('a1'), assignment('a2')]);
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Homework - Calculus' }),
      );
      expect(getCalendarSync().syncedReminderAssignments).toEqual({
        a1: 'r1',
        a2: 'new-reminder',
      });
    });

    it('deletes the reminders of removed assignments', async () => {
      useCalendarSyncStore.setState({
        syncedReminderAssignments: { a1: 'r1' },
      });
      const remove = jest.fn(async () => {});
      mocked.ExpoCalendarReminder.get.mockResolvedValue({ delete: remove });
      await saveAsUser('reminder', [], ['a1']);
      expect(mocked.ExpoCalendarReminder.get).toHaveBeenCalledWith('r1');
      expect(remove).toHaveBeenCalled();
      expect(getCalendarSync().syncedReminderAssignments).toEqual({});
    });
  });

  it('removes only calendars on Android, which has no Reminders', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    mocked.getRemindersPermissions.mockResolvedValue({ status: 'denied' });
    useCalendarSyncStore.setState({ courseCalendarId: 'c' });
    const course = { id: 'c', title: 'x', delete: jest.fn(async () => {}) };
    mocked.getCalendars.mockResolvedValue([course]);
    await removeCalendars();
    expect(mocked.getCalendars).not.toHaveBeenCalledWith('reminder');
    expect(course.delete).toHaveBeenCalled();
  });
});
