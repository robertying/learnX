import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage } from 'data/storage';
import storeVersions from 'data/storeVersions.json';

export const CALENDAR_SYNC_KEY = 'calendarSync';

/** Which of the phone's calendars learnX keeps its entries in. */
export type SyncedCalendar =
  | 'courseCalendarId'
  | 'assignmentCalendarId'
  | 'assignmentReminderId';

/** Calendar events or reminders made for assignments. */
export type AssignmentEventType = 'calendar' | 'reminder';

/**
 * What the calendar and Reminders sync has made on the phone: the calendars
 * it created or adopted, and the event or reminder of each assignment, so a
 * later sync updates them instead of adding more. The choices of what to sync
 * are settings (`data/settings`); this is the sync's own bookkeeping.
 */
export interface CalendarSyncState {
  courseCalendarId?: string;
  assignmentCalendarId?: string;
  assignmentReminderId?: string;
  /** Calendar event id by assignment id. */
  syncedCalendarAssignments: Record<string, string>;
  /** Reminder id (iOS) or event id (Android) by assignment id. */
  syncedReminderAssignments: Record<string, string>;
  /**
   * What each assignment's event or reminder was last written from (a hash
   * of its details), by assignment id, so one is written again only when it
   * changed.
   */
  writtenCalendarAssignments: Record<string, string>;
  writtenReminderAssignments: Record<string, string>;
  /** When each sync last finished without an error (ms), for Settings. */
  lastSynced?: Partial<Record<SyncKind, number>>;
  /**
   * What each week's classes in the calendar were last written from (a hash
   * of its timetable and the class settings), by the week's Monday, so a week
   * is written again only when one of them changed.
   */
  writtenClassWeeks: Record<string, string>;
}

/** The syncs Settings › Calendar & Reminders shows a time for. */
export type SyncKind = 'courseSchedule' | AssignmentEventType;

export const emptyCalendarSync = (): CalendarSyncState => ({
  syncedCalendarAssignments: {},
  syncedReminderAssignments: {},
  writtenCalendarAssignments: {},
  writtenReminderAssignments: {},
  writtenClassWeeks: {},
});

export const useCalendarSyncStore = create<CalendarSyncState>()(
  persist(emptyCalendarSync, {
    name: CALENDAR_SYNC_KEY,
    version: storeVersions[CALENDAR_SYNC_KEY],
    storage: persistStorage,
  }),
);

export const getCalendarSync = () => useCalendarSyncStore.getState();

export const setSyncedCalendarId = (
  calendar: SyncedCalendar,
  id: string | undefined,
) => {
  useCalendarSyncStore.setState({ [calendar]: id });
};

const syncedKey = (type: AssignmentEventType) =>
  type === 'calendar'
    ? 'syncedCalendarAssignments'
    : 'syncedReminderAssignments';

const writtenKey = (type: AssignmentEventType) =>
  type === 'calendar'
    ? 'writtenCalendarAssignments'
    : 'writtenReminderAssignments';

/** The events or reminders made for assignments, by assignment id. */
export const getAssignmentEventIds = (type: AssignmentEventType) =>
  getCalendarSync()[syncedKey(type)];

/** Remembers the calendar event or reminder made for an assignment. */
export const setEventIdForAssignment = (
  type: AssignmentEventType,
  assignmentId: string,
  eventId: string,
) => {
  const key = syncedKey(type);
  useCalendarSyncStore.setState(state => ({
    [key]: { ...state[key], [assignmentId]: eventId },
  }));
};

export const removeEventIdForAssignment = (
  type: AssignmentEventType,
  assignmentId: string,
) => {
  const key = syncedKey(type);
  const written = writtenKey(type);
  useCalendarSyncStore.setState(state => {
    const { [assignmentId]: _removed, ...synced } = state[key];
    const { [assignmentId]: _written, ...rest } = state[written];
    return { [key]: synced, [written]: rest };
  });
};

/** What the assignments' events or reminders were last written from. */
export const getAssignmentsWritten = (type: AssignmentEventType) =>
  getCalendarSync()[writtenKey(type)];

/**
 * Notes what these assignments' events or reminders were just written from
 * (hashes by assignment id), in one change for the whole sync.
 */
export const setAssignmentsWritten = (
  type: AssignmentEventType,
  written: Record<string, string>,
) => {
  if (Object.keys(written).length === 0) {
    return;
  }
  const key = writtenKey(type);
  useCalendarSyncStore.setState(state => ({
    [key]: { ...state[key], ...written },
  }));
};

/** Notes that a sync just finished without an error. */
export const setLastSynced = (kind: SyncKind, time = Date.now()) => {
  useCalendarSyncStore.setState(state => ({
    lastSynced: { ...state.lastSynced, [kind]: time },
  }));
};

/**
 * Notes what a week's classes in the calendar were just written from, and
 * forgets the weeks before `thisWeek` (its Monday): the sync only follows
 * this week and later ones, so the record doesn't keep growing.
 */
export const setClassWeekWritten = (
  weekStart: string,
  key: string,
  thisWeek: string,
) => {
  useCalendarSyncStore.setState(state => ({
    writtenClassWeeks: Object.fromEntries(
      Object.entries({
        ...state.writtenClassWeeks,
        [weekStart]: key,
      }).filter(([week]) => week >= thisWeek),
    ),
  }));
};

/** Forgets which weeks' classes were written, as for a new course calendar. */
export const clearClassWeeksWritten = () => {
  useCalendarSyncStore.setState({ writtenClassWeeks: {} });
};

export const clearEventIds = (type: AssignmentEventType) => {
  useCalendarSyncStore.setState({
    [syncedKey(type)]: {},
    [writtenKey(type)]: {},
  });
};

/** Forgets the synced calendars and events, as when sync is turned off. */
export const resetCalendarSync = () => {
  useCalendarSyncStore.setState(emptyCalendarSync(), true);
};
