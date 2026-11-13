import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage } from 'data/storage';
import { defaultSwipeSettings } from 'helpers/cardActions';
import { SettingsState } from 'data/types/state';

export const SETTINGS_KEY = 'settings';

export const defaultSettings: SettingsState = {
  courseCalendarSync: false,
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
