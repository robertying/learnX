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
}

export const emptyCalendarSync = (): CalendarSyncState => ({
  syncedCalendarAssignments: {},
  syncedReminderAssignments: {},
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

export const clearEventIds = (type: AssignmentEventType) => {
  useCalendarSyncStore.setState({ [syncedKey(type)]: {} });
};

/** Forgets the synced calendars and events, as when sync is turned off. */
export const resetCalendarSync = () => {
  useCalendarSyncStore.setState(emptyCalendarSync(), true);
};
