import Storage from 'expo-sqlite/kv-store';
import {
  defaultSettings,
  getSettings,
  resetSettings,
  setSetting,
  SETTINGS_KEY,
  useSettingsStore,
} from 'data/settings';
import { getCalendarSync, resetCalendarSync } from 'data/calendarSync';
import { APP_STATE_KEY, resetAppState, useAppStateStore } from 'data/appState';

const kv = (Storage as unknown as { __store: Map<string, string> }).__store;

beforeEach(() => {
  resetSettings();
  resetCalendarSync();
  resetAppState();
});

describe('settings', () => {
  it('has the default settings', () => {
    expect(getSettings()).toEqual(defaultSettings);
    expect(defaultSettings).toMatchInlineSnapshot(`
     {
       "alarms": {
         "assignmentCalendarAlarm": false,
         "assignmentCalendarNoAlarmIfComplete": false,
         "assignmentCalendarSecondAlarm": false,
         "assignmentReminderAlarm": false,
         "courseAlarm": false,
       },
       "assignmentCalendarSync": false,
       "assignmentReminderSync": false,
       "courseEventOmitLocation": false,
       "courseInformationSharing": false,
       "graduate": false,
       "notifications": {
         "assignments": false,
         "classReminderOffset": 15,
         "classReminders": false,
         "deadlineChanges": false,
         "deadlineReminderOffset": 1440,
         "deadlineReminders": false,
         "files": false,
         "grades": false,
         "groupSubmissions": false,
         "notices": false,
       },
       "openFileAfterDownload": false,
       "swipeActions": {
         "left": "fav",
         "right": "archive",
       },
       "tabFilterSelections": {
         "assignment": "unfinished",
         "course": "all",
         "file": "all",
         "notice": "all",
       },
     }
    `);
  });

  it('replaces a setting', () => {
    setSetting('graduate', true);
    setSetting('calendarEventLength', 45);
    setSetting('alarms', { ...defaultSettings.alarms, courseAlarm: true });
    expect(getSettings()).toMatchObject({
      graduate: true,
      calendarEventLength: 45,
      alarms: { ...defaultSettings.alarms, courseAlarm: true },
    });
  });

  it('fills in settings added after they were saved', async () => {
    kv.set(
      SETTINGS_KEY,
      JSON.stringify({
        state: {
          graduate: true,
          alarms: { courseAlarm: true },
          tabFilterSelections: { notice: 'fav' },
          swipeActions: { left: 'none' },
        },
        version: 1,
      }),
    );
    await useSettingsStore.persist.rehydrate();
    expect(getSettings()).toEqual({
      ...defaultSettings,
      graduate: true,
      alarms: { ...defaultSettings.alarms, courseAlarm: true },
      tabFilterSelections: {
        ...defaultSettings.tabFilterSelections,
        notice: 'fav',
      },
      swipeActions: { right: 'archive', left: 'none' },
    });
  });
});

describe('settings saved before version 2', () => {
  it('moves the calendar sync and badges into their own stores', async () => {
    kv.set(
      SETTINGS_KEY,
      JSON.stringify({
        state: {
          graduate: true,
          courseCalendarId: 'c',
          assignmentCalendarId: 'a',
          syncedCalendarAssignments: { a1: 'e1' },
          syncedReminderAssignments: { a1: 3 },
          lastShowChangelogVersion: '18.0.3',
          courseInformationSharingBadgeShown: true,
        },
        version: 1,
      }),
    );
    await useSettingsStore.persist.rehydrate();
    expect(getSettings()).toEqual({ ...defaultSettings, graduate: true });
    expect(getCalendarSync()).toEqual({
      courseCalendarId: 'c',
      assignmentCalendarId: 'a',
      syncedCalendarAssignments: { a1: 'e1' },
      // Not a map of strings, so dropped.
      syncedReminderAssignments: {},
    });
    // The changelog's version is dropped: its badge is gone.
    expect(useAppStateStore.getState()).toEqual({
      courseSharingSeen: true,
      welcomeSeen: false,
      setupSeen: false,
      whatsNewSeenVersion: null,
    });
  });
});

describe('settings saved before version 3', () => {
  it('drops the download folder and file name settings', async () => {
    kv.set(
      SETTINGS_KEY,
      JSON.stringify({
        state: {
          graduate: true,
          fileUseDocumentDir: true,
          fileOmitCourseName: true,
        },
        version: 2,
      }),
    );
    await useSettingsStore.persist.rehydrate();
    expect(getSettings()).toEqual({ ...defaultSettings, graduate: true });
  });
});

describe('app state saved before version 2', () => {
  it('drops the changelog version its badge kept', async () => {
    kv.set(
      APP_STATE_KEY,
      JSON.stringify({
        state: { changelogSeenVersion: '18.0.3', courseSharingSeen: true },
        version: 1,
      }),
    );
    await useAppStateStore.persist.rehydrate();
    expect(useAppStateStore.getState()).not.toHaveProperty(
      'changelogSeenVersion',
    );
    expect(useAppStateStore.getState().courseSharingSeen).toBe(true);
  });

  it('keeps what version 2 saved', async () => {
    kv.set(
      APP_STATE_KEY,
      JSON.stringify({ state: { welcomeSeen: true }, version: 2 }),
    );
    await useAppStateStore.persist.rehydrate();
    expect(useAppStateStore.getState().welcomeSeen).toBe(true);
  });
});
