import * as Calendar from 'expo-calendar';
import {
  getCalendarSync,
  resetCalendarSync,
  useCalendarSyncStore,
} from 'data/calendarSync';
import { clearQueryCache, queryClient } from 'data/queryClient';
import { calendarWeekQuery } from 'data/schedule';
import { resetSettings, setSetting } from 'data/settings';
import type { CalendarClass } from 'helpers/schedule';
import {
  saveClassesToCalendar,
  syncedClassesMissing,
  syncedClassWeeks,
  updateSyncedClasses,
} from 'services/calendar/classes';
import { CalendarError } from 'services/calendar/errors';

const mocked = Calendar as unknown as Record<string, jest.Mock>;

const cls = (start: string, courseName = 'Calculus'): CalendarClass => ({
  courseName,
  location: '六教6A017',
  start,
  end: start.replace(/T\d\d/, m => `T${Number(m.slice(1)) + 1}`),
});

interface FakeEvent {
  startDate: string;
  delete: jest.Mock;
}

/** An event in `events`, which deleting takes out. */
const event = (startDate: string, events?: FakeEvent[]): FakeEvent => {
  const e: FakeEvent = {
    startDate,
    delete: jest.fn(async () => {
      events?.splice(events.indexOf(e), 1);
    }),
  };
  return e;
};

/**
 * A calendar that keeps the events made in it, listed by their start. Events
 * given by their start leave it when deleted.
 */
const fakeCalendar = (initial: (FakeEvent | string)[] = []) => {
  const events: FakeEvent[] = [];
  events.push(
    ...initial.map(e => (typeof e === 'string' ? event(e, events) : e)),
  );
  return {
    id: 'courses',
    title: 'learnX 课表',
    events,
    listEvents: jest.fn(async (from: Date, to: Date) =>
      events.filter(e => {
        const t = new Date(e.startDate).getTime();
        return from.getTime() <= t && t < to.getTime();
      }),
    ),
    createEvent: jest.fn(async (details: { startDate: Date }) => {
      events.push(event(details.startDate.toISOString(), events));
      return { id: 'new' };
    }),
  };
};

const grant = (status = 'granted') => {
  mocked.getCalendarPermissions.mockResolvedValue({ status });
  mocked.requestCalendarPermissions.mockResolvedValue({ status });
};

// Monday 2026-03-09 and the week after.
const week1 = '2026-03-09';
const week2 = '2026-03-16';
const setWeek = (week: string, classes: CalendarClass[], graduate = false) =>
  queryClient.setQueryData(calendarWeekQuery(week, graduate).queryKey, classes);

beforeEach(() => {
  clearQueryCache();
  resetSettings();
  resetCalendarSync();
  grant();
  useCalendarSyncStore.setState({ courseCalendarId: 'courses' });
});

describe('saveClassesToCalendar', () => {
  it('replaces whole Beijing days, whatever time the range was picked at', async () => {
    const before = event('2026-03-08T23:30:00+08:00');
    const firstMorning = event('2026-03-09T08:00:00+08:00');
    const lastEvening = event('2026-03-15T19:20:00+08:00');
    const calendar = fakeCalendar([before, firstMorning, lastEvening]);
    mocked.getCalendars.mockResolvedValue([calendar]);
    const classes = [
      cls('2026-03-09T08:00:00+08:00'),
      cls('2026-03-15T19:20:00+08:00'),
    ];
    setWeek(week1, classes);

    await saveClassesToCalendar(classes, {
      first: '2026-03-09',
      last: '2026-03-15',
      graduate: false,
    });

    expect(calendar.listEvents).toHaveBeenCalledWith(
      new Date('2026-03-09T00:00:00+08:00'),
      new Date('2026-03-16T00:00:00+08:00'),
    );
    expect(before.delete).not.toHaveBeenCalled();
    expect(firstMorning.delete).toHaveBeenCalled();
    expect(lastEvening.delete).toHaveBeenCalled();
    expect(calendar.createEvent).toHaveBeenCalledTimes(2);
    expect(calendar.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Calculus',
        location: '清华大学第六教学楼 六教6A017',
      }),
    );
    expect(Object.keys(getCalendarSync().writtenClassWeeks)).toEqual([week1]);
  });

  it('keeps the days of weeks the registrar could not list', async () => {
    const kept = event('2026-03-10T08:00:00+08:00');
    const replaced = event('2026-03-17T08:00:00+08:00');
    const calendar = fakeCalendar([kept, replaced]);
    mocked.getCalendars.mockResolvedValue([calendar]);
    setWeek(week1, [cls('2026-03-10T08:00:00+08:00')]);
    setWeek(week2, []);

    await saveClassesToCalendar(
      [cls('2026-03-10T08:00:00+08:00')],
      { first: week1, last: '2026-03-22', graduate: false },
      [{ startDate: '20260309', endDate: '20260315' }],
    );

    expect(kept.delete).not.toHaveBeenCalled();
    expect(replaced.delete).toHaveBeenCalled();
    expect(calendar.createEvent).not.toHaveBeenCalled();
    // The failed week is written once the timetable has it.
    expect(Object.keys(getCalendarSync().writtenClassWeeks)).toEqual([week2]);
  });

  it('needs the calendar permission, and asks for it', async () => {
    grant('denied');
    await expect(
      saveClassesToCalendar([], { first: week1, last: week1, graduate: false }),
    ).rejects.toThrow(new CalendarError('calendarPermission'));
    expect(mocked.requestCalendarPermissions).toHaveBeenCalled();
  });

  it('writes one sync at a time', async () => {
    const order: string[] = [];
    let release = () => {};
    const calendar = fakeCalendar();
    calendar.listEvents
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            release = () => resolve([]);
          }),
      )
      .mockImplementation(async () => {
        order.push('second listed');
        return [];
      });
    calendar.createEvent.mockImplementation(async () => {
      order.push('first wrote');
      return { id: 'new' };
    });
    mocked.getCalendars.mockResolvedValue([calendar]);
    const range = { first: week1, last: week1, graduate: false };

    const first = saveClassesToCalendar(
      [cls('2026-03-09T08:00:00+08:00')],
      range,
    );
    const second = saveClassesToCalendar([], range);
    await new Promise(resolve => setTimeout(resolve, 0));
    release();
    await Promise.all([first, second]);
    expect(order).toEqual(['first wrote', 'second listed']);
  });
});

describe('updateSyncedClasses', () => {
  const now = new Date('2026-03-11T12:00:00+08:00').getTime();
  let calendar: ReturnType<typeof fakeCalendar>;

  beforeEach(() => {
    calendar = fakeCalendar([
      '2026-03-10T08:00:00+08:00',
      '2026-03-12T08:00:00+08:00',
    ]);
    mocked.getCalendars.mockResolvedValue([calendar]);
    setSetting('courseCalendarSync', true);
    // A week already over, and this week.
    setWeek('2026-03-02', [cls('2026-03-03T08:00:00+08:00')]);
    setWeek(week1, [
      cls('2026-03-10T08:00:00+08:00'),
      cls('2026-03-12T08:00:00+08:00'),
    ]);
  });

  it('writes the saved weeks from today on, once per change', async () => {
    await updateSyncedClasses(now);

    // This week only, from today: not the classes already over.
    expect(calendar.listEvents).toHaveBeenCalledWith(
      new Date('2026-03-11T00:00:00+08:00'),
      new Date('2026-03-16T00:00:00+08:00'),
    );
    expect(calendar.createEvent).toHaveBeenCalledTimes(1);
    expect(calendar.events.map(e => e.startDate)).toEqual([
      '2026-03-10T08:00:00+08:00',
      '2026-03-12T00:00:00.000Z',
    ]);
    expect(getCalendarSync().lastSynced?.courseSchedule).toBeGreaterThan(0);

    // Nothing changed: only listed to check.
    await updateSyncedClasses(now);
    expect(calendar.createEvent).toHaveBeenCalledTimes(1);

    setSetting('courseEventOmitLocation', true);
    await updateSyncedClasses(now);
    expect(calendar.createEvent).toHaveBeenCalledTimes(2);
    expect(calendar.createEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({ location: undefined }),
    );

    // Today fetches the week again and a class has moved.
    setWeek(week1, [cls('2026-03-13T10:00:00+08:00')]);
    await updateSyncedClasses(now);
    expect(calendar.createEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startDate: new Date('2026-03-13T10:00:00+08:00'),
      }),
    );

    // A week Today or Schedule fetches next.
    setWeek(week2, [cls('2026-03-17T08:00:00+08:00')]);
    await updateSyncedClasses(now);
    expect(calendar.listEvents).toHaveBeenLastCalledWith(
      new Date('2026-03-16T00:00:00+08:00'),
      new Date('2026-03-23T00:00:00+08:00'),
    );
  });

  it('writes a week again when its events were deleted in Calendar', async () => {
    setWeek(week2, [cls('2026-03-17T08:00:00+08:00')]);
    await updateSyncedClasses(now);
    await expect(syncedClassesMissing(now)).resolves.toBe(false);
    const written = calendar.createEvent.mock.calls.length;

    // The user deletes next week's class; this week's stay.
    const deleted = calendar.events.find(
      e => new Date(e.startDate) >= new Date('2026-03-16T00:00:00+08:00'),
    )!;
    calendar.events.splice(calendar.events.indexOf(deleted), 1);
    await expect(syncedClassesMissing(now)).resolves.toBe(true);

    await updateSyncedClasses(now);
    expect(calendar.createEvent).toHaveBeenCalledTimes(written + 1);
    expect(calendar.createEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startDate: new Date('2026-03-17T08:00:00+08:00'),
      }),
    );
    await expect(syncedClassesMissing(now)).resolves.toBe(false);
  });

  it('makes the calendar again with every week when it was deleted', async () => {
    setWeek(week2, [cls('2026-03-17T08:00:00+08:00')]);
    await updateSyncedClasses(now);

    // The user deletes the whole calendar.
    const remade = fakeCalendar();
    mocked.getCalendars.mockResolvedValue([
      { id: 'x', title: 'Home', source: { id: 'src', type: 'local' } },
    ]);
    mocked.createCalendar.mockImplementation(async () => {
      mocked.getCalendars.mockResolvedValue([remade]);
      return remade;
    });
    await expect(syncedClassesMissing(now)).resolves.toBe(true);

    await updateSyncedClasses(now);
    expect(mocked.createCalendar).toHaveBeenCalledTimes(1);
    expect(remade.events).toHaveLength(2);
    expect(Object.keys(getCalendarSync().writtenClassWeeks).sort()).toEqual([
      week1,
      week2,
    ]);
    await expect(syncedClassesMissing(now)).resolves.toBe(false);
  });

  it("doesn't count classes already over today", async () => {
    await updateSyncedClasses(now);
    // The class on Tuesday, before today, is gone; Thursday's is there.
    calendar.events.splice(0, 1);
    await expect(syncedClassesMissing(now)).resolves.toBe(false);
  });

  it('follows the timetable the settings pick', async () => {
    setSetting('graduate', true);
    await updateSyncedClasses(now);
    expect(calendar.listEvents).not.toHaveBeenCalled();
    setWeek(week1, [cls('2026-03-12T08:00:00+08:00')], true);
    await updateSyncedClasses(now);
    expect(calendar.createEvent).toHaveBeenCalledTimes(1);
  });

  it('does nothing while the sync is off', async () => {
    setSetting('courseCalendarSync', false);
    await updateSyncedClasses(now);
    expect(mocked.getCalendars).not.toHaveBeenCalled();
    expect(syncedClassWeeks(now)).toEqual([]);
  });

  it('never asks for the permission, and skips without it', async () => {
    grant('denied');
    await expect(syncedClassesMissing(now)).resolves.toBe(false);
    await updateSyncedClasses(now);
    expect(mocked.requestCalendarPermissions).not.toHaveBeenCalled();
    expect(calendar.listEvents).not.toHaveBeenCalled();
  });

  it('makes the calendar when there is none', async () => {
    useCalendarSyncStore.setState({ courseCalendarId: undefined });
    mocked.getCalendars.mockResolvedValue([
      { id: 'x', title: 'Home', source: { id: 'src', type: 'local' } },
    ]);
    mocked.createCalendar.mockResolvedValue(calendar);
    await updateSyncedClasses(now);
    expect(mocked.createCalendar).toHaveBeenCalled();
    expect(calendar.createEvent).toHaveBeenCalled();
  });

  it('lists the saved weeks it follows, earliest first', () => {
    setWeek(week2, []);
    expect(syncedClassWeeks(now)).toEqual([
      queryClient.getQueryData(calendarWeekQuery(week1, false).queryKey),
      [],
    ]);
  });
});
