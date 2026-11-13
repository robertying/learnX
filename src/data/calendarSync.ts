import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage } from 'data/storage';

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
  writtenClassWeeks: {},
});

export const useCalendarSyncStore = create<CalendarSyncState>()(
  persist(emptyCalendarSync, {
    name: CALENDAR_SYNC_KEY,
    version: 1,
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
  useCalendarSyncStore.setState(state => {
    const { [assignmentId]: _removed, ...synced } = state[key];
    return { [key]: synced };
  });
};

/** Notes that a sync just finished without an error. */
export const setLastSynced = (kind: SyncKind, time = Date.now()) => {
  useCalendarSyncStore.setState(state => ({
    lastSynced: { ...state.lastSynced, [kind]: time },
  }));
};

/** Notes what a week's classes in the calendar were just written from. */
export const setClassWeekWritten = (weekStart: string, key: string) => {
  useCalendarSyncStore.setState(state => ({
    writtenClassWeeks: { ...state.writtenClassWeeks, [weekStart]: key },
  }));
};

/** Forgets which weeks' classes were written, as for a new course calendar. */
export const clearClassWeeksWritten = () => {
  useCalendarSyncStore.setState({ writtenClassWeeks: {} });
};

export const clearEventIds = (type: AssignmentEventType) => {
  useCalendarSyncStore.setState({ [syncedKey(type)]: {} });
};

/** Forgets the synced calendars and events, as when sync is turned off. */
export const resetCalendarSync = () => {
  useCalendarSyncStore.setState(emptyCalendarSync(), true);
};
