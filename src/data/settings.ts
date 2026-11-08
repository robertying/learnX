import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage } from 'data/storage';
import { SettingsState } from 'data/types/state';

export const SETTINGS_KEY = 'settings';

export const defaultSettings: SettingsState = {
  assignmentCalendarSync: false,
  assignmentReminderSync: false,
  syncedCalendarAssignments: {},
  syncedReminderAssignments: {},
  newUpdate: false,
  graduate: false,
  fileUseDocumentDir: false,
  fileOmitCourseName: false,
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
    deadlineReminders: false,
    deadlineReminderOffset: 24 * 60,
  },
  courseInformationSharing: false,
  courseInformationSharingBadgeShown: false,
  lastShowChangelogVersion: null,
  openFileAfterDownload: false,
  courseEventOmitLocation: false,
};

/** Only means something while the app runs: rechecked on every launch. */
type TransientSetting = 'newUpdate';
export type PersistedSettings = Omit<SettingsState, TransientSetting>;

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
  newUpdate: current.newUpdate,
});

export const useSettingsStore = create<SettingsState>()(
  persist(() => defaultSettings, {
    name: SETTINGS_KEY,
    version: 1,
    storage: persistStorage,
    partialize: (state): PersistedSettings => {
      const persisted: Partial<SettingsState> = { ...state };
      delete persisted.newUpdate;
      return persisted as PersistedSettings;
    },
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

type EventType = 'calendar' | 'reminder';

const syncedKey = (type: EventType) =>
  type === 'calendar'
    ? 'syncedCalendarAssignments'
    : 'syncedReminderAssignments';

/** Remembers the calendar event or reminder made for an assignment. */
export const setEventIdForAssignment = (
  type: EventType,
  assignmentId: string,
  eventId: string,
) => {
  const key = syncedKey(type);
  useSettingsStore.setState(state => ({
    [key]: { ...state[key], [assignmentId]: eventId },
  }));
};

export const removeEventIdForAssignment = (
  type: EventType,
  assignmentId: string,
) => {
  const key = syncedKey(type);
  useSettingsStore.setState(state => {
    const { [assignmentId]: _removed, ...synced } = state[key] ?? {};
    return { [key]: synced };
  });
};

export const clearEventIds = (type: EventType) => {
  useSettingsStore.setState({ [syncedKey(type)]: {} });
};
