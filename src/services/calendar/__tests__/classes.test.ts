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

const event = (startDate: string) => ({
  startDate,
  delete: jest.fn(async () => {}),
});

const fakeCalendar = (events: ReturnType<typeof event>[] = []) => ({
  id: 'courses',
  title: 'learnX 课表',
  listEvents: jest.fn(async () => events),
  createEvent: jest.fn(async () => ({ id: 'new' })),
});

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
    expect(getCalendarSync().classSync).toEqual({
      first: '2026-03-09',
      last: '2026-03-15',
      graduate: false,
    });
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
    expect(getCalendarSync().classSync).toBeUndefined();
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
    jest.spyOn(Date, 'now').mockReturnValue(now);
    calendar = fakeCalendar([
      event('2026-03-10T08:00:00+08:00'),
      event('2026-03-12T08:00:00+08:00'),
    ]);
    mocked.getCalendars.mockResolvedValue([calendar]);
    useCalendarSyncStore.setState({
      classSync: { first: week1, last: '2026-03-22', graduate: false },
    });
    setWeek(week1, [
      cls('2026-03-10T08:00:00+08:00'),
      cls('2026-03-12T08:00:00+08:00'),
    ]);
  });

  it('writes the synced days from today on, once per change', async () => {
    await updateSyncedClasses();

    // Only week 1 is saved; from today, not the classes already over.
    expect(calendar.listEvents).toHaveBeenCalledTimes(1);
    expect(calendar.listEvents).toHaveBeenCalledWith(
      new Date('2026-03-11T00:00:00+08:00'),
      new Date('2026-03-16T00:00:00+08:00'),
    );
    expect(calendar.createEvent).toHaveBeenCalledTimes(1);

    await updateSyncedClasses();
    expect(calendar.listEvents).toHaveBeenCalledTimes(1);

    setSetting('courseEventOmitLocation', true);
    await updateSyncedClasses();
    expect(calendar.listEvents).toHaveBeenCalledTimes(2);
    expect(calendar.createEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({ location: undefined }),
    );

    setWeek(week2, [cls('2026-03-17T08:00:00+08:00')]);
    await updateSyncedClasses();
    expect(calendar.listEvents).toHaveBeenLastCalledWith(
      new Date('2026-03-16T00:00:00+08:00'),
      new Date('2026-03-23T00:00:00+08:00'),
    );
  });

  it('follows the timetable the classes were synced from', async () => {
    setSetting('graduate', true);
    await updateSyncedClasses();
    expect(calendar.createEvent).toHaveBeenCalledTimes(1);
  });

  it('does nothing once the synced days are over', async () => {
    useCalendarSyncStore.setState({
      classSync: { first: week1, last: '2026-03-10', graduate: false },
    });
    await updateSyncedClasses();
    expect(mocked.getCalendars).not.toHaveBeenCalled();
    expect(syncedClassWeeks()).toEqual([]);
  });

  it('does nothing before a sync', async () => {
    useCalendarSyncStore.setState({ classSync: undefined });
    await updateSyncedClasses();
    expect(mocked.getCalendars).not.toHaveBeenCalled();
  });

  it('never asks for the permission, and skips without it', async () => {
    grant('denied');
    await updateSyncedClasses();
    expect(mocked.requestCalendarPermissions).not.toHaveBeenCalled();
    expect(calendar.listEvents).not.toHaveBeenCalled();
  });

  it("doesn't make the calendar again once it's deleted", async () => {
    mocked.getCalendars.mockResolvedValue([]);
    await updateSyncedClasses();
    expect(mocked.createCalendar).not.toHaveBeenCalled();
  });

  it('lists the saved weeks it follows', () => {
    expect(syncedClassWeeks()).toEqual([
      queryClient.getQueryData(calendarWeekQuery(week1, false).queryKey),
      undefined,
    ]);
  });
});
