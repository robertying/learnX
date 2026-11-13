import Storage from 'expo-sqlite/kv-store';
import {
  defaultSettings,
  getSettings,
  resetSettings,
  setSetting,
  SETTINGS_KEY,
  useSettingsStore,
} from 'data/settings';
import { resetCalendarSync } from 'data/calendarSync';
import { resetAppState } from 'data/appState';

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
       "courseCalendarSync": false,
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
        version: 3,
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
