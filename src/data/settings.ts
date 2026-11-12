import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage } from 'data/storage';
import { defaultSwipeSettings } from 'helpers/cardActions';
import { SettingsState } from 'data/types/state';
import {
  type CalendarSyncState,
  useCalendarSyncStore,
} from 'data/calendarSync';
import { type AppState, useAppStateStore } from 'data/appState';

export const SETTINGS_KEY = 'settings';

export const defaultSettings: SettingsState = {
  assignmentCalendarSync: false,
  assignmentReminderSync: false,
  graduate: false,
  tabFilterSelections: {
    notice: 'all',
    assignment: 'unfinished',
    file: 'all',
    course: 'all',
  },
  alarms: {
    assignmentCalendarSecondAlarm: false,
    assignmentCalendarAlarm: false,
    assignmentCalendarNoAlarmIfComplete: false,
    assignmentReminderAlarm: false,
    courseAlarm: false,
  },
  notifications: {
    notices: false,
    files: false,
    assignments: false,
    grades: false,
    deadlineChanges: false,
    groupSubmissions: false,
    deadlineReminders: false,
    deadlineReminderOffset: 24 * 60,
    classReminders: false,
    classReminderOffset: 15,
  },
  courseInformationSharing: false,
  openFileAfterDownload: false,
  courseEventOmitLocation: false,
  swipeActions: defaultSwipeSettings,
};

/**
 * Lays saved settings over the current ones. Nested objects merge one level
 * deep so a setting added in a later version keeps its default.
 */
export const mergeSettings = (
  current: SettingsState,
  saved: Partial<SettingsState>,
): SettingsState => ({
  ...current,
  ...saved,
  tabFilterSelections: {
    ...current.tabFilterSelections,
    ...saved.tabFilterSelections,
  },
  alarms: { ...current.alarms, ...saved.alarms },
  notifications: { ...current.notifications, ...saved.notifications },
  swipeActions: { ...current.swipeActions, ...saved.swipeActions },
});

const isStringRecord = (value: unknown): value is Record<string, string> =>
  !!value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.values(value).every(item => typeof item === 'string');

/**
 * Moves what settings used to hold besides settings into its own store: the
 * calendar sync's bookkeeping (`data/calendarSync`) and what the user has
 * seen (`data/appState`). Values of the wrong type are dropped. Returns the
 * rest, the settings themselves.
 */
export const moveOutOfSettings = (saved: Record<string, unknown>) => {
  const {
    courseCalendarId,
    assignmentCalendarId,
    assignmentReminderId,
    syncedCalendarAssignments,
    syncedReminderAssignments,
    // The changelog's badge is gone, so its version isn't kept.
    lastShowChangelogVersion: _changelog,
    courseInformationSharingBadgeShown,
    newUpdate: _transient,
    ...rest
  } = saved;

  const calendarSync: Partial<CalendarSyncState> = {};
  const ids = { courseCalendarId, assignmentCalendarId, assignmentReminderId };
  for (const [key, id] of Object.entries(ids)) {
    if (typeof id === 'string') {
      calendarSync[key as keyof typeof ids] = id;
    }
  }
  if (isStringRecord(syncedCalendarAssignments)) {
    calendarSync.syncedCalendarAssignments = syncedCalendarAssignments;
  }
  if (isStringRecord(syncedReminderAssignments)) {
    calendarSync.syncedReminderAssignments = syncedReminderAssignments;
  }
  if (Object.keys(calendarSync).length > 0) {
    useCalendarSyncStore.setState(calendarSync);
  }

  const appState: Partial<AppState> = {};
  if (courseInformationSharingBadgeShown === true) {
    appState.courseSharingSeen = true;
  }
  if (Object.keys(appState).length > 0) {
    useAppStateStore.setState(appState);
  }

  return rest;
};

export const useSettingsStore = create<SettingsState>()(
  persist(() => defaultSettings, {
    name: SETTINGS_KEY,
    // Earlier versions only ran in development builds; 18.0.x's settings
    // come in through `data/legacy`.
    version: 3,
    storage: persistStorage,
    merge: (saved, current) =>
      mergeSettings(current, (saved ?? {}) as Partial<SettingsState>),
  }),
);

export const useSettings = <T>(selector: (settings: SettingsState) => T) =>
  useSettingsStore(selector);

export const getSettings = () => useSettingsStore.getState();

export const setSetting = <K extends keyof SettingsState>(
  key: K,
  value: SettingsState[K],
) => {
  useSettingsStore.setState({ [key]: value } as Pick<SettingsState, K>);
};

export const resetSettings = () => {
  useSettingsStore.setState(defaultSettings, true);
};
