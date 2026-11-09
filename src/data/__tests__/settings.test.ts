import Storage from 'expo-sqlite/kv-store';
import {
  clearEventIds,
  defaultSettings,
  getSettings,
  removeEventIdForAssignment,
  resetSettings,
  setEventIdForAssignment,
  setSetting,
  SETTINGS_KEY,
  useSettingsStore,
} from 'data/settings';

const kv = (Storage as unknown as { __store: Map<string, string> }).__store;

beforeEach(() => {
  resetSettings();
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
        "courseInformationSharingBadgeShown": false,
        "fileOmitCourseName": false,
        "fileUseDocumentDir": false,
        "graduate": false,
        "lastShowChangelogVersion": null,
        "notifications": {
          "assignments": false,
          "deadlineChanges": false,
          "deadlineReminderOffset": 1440,
          "deadlineReminders": false,
          "files": false,
          "grades": false,
          "notices": false,
        },
        "openFileAfterDownload": false,
        "syncedCalendarAssignments": {},
        "syncedReminderAssignments": {},
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

  it('clears a synced map when given an empty one', () => {
    setEventIdForAssignment('calendar', 'a1', 'e1');
    setSetting('syncedCalendarAssignments', {});
    expect(getSettings().syncedCalendarAssignments).toEqual({});
  });

  it('tracks synced events per assignment and type', () => {
    setEventIdForAssignment('calendar', 'a1', 'e1');
    setEventIdForAssignment('calendar', 'a2', 'e2');
    setEventIdForAssignment('reminder', 'a1', 'r1');
    removeEventIdForAssignment('calendar', 'a1');
    expect(getSettings().syncedCalendarAssignments).toEqual({ a2: 'e2' });
    expect(getSettings().syncedReminderAssignments).toEqual({ a1: 'r1' });

    clearEventIds('reminder');
    expect(getSettings().syncedReminderAssignments).toEqual({});
    expect(getSettings().syncedCalendarAssignments).toEqual({ a2: 'e2' });
  });

  it('fills in settings added after they were saved', async () => {
    kv.set(
      SETTINGS_KEY,
      JSON.stringify({
        state: {
          graduate: true,
          alarms: { courseAlarm: true },
          tabFilterSelections: { notice: 'fav' },
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
    });
  });
});
