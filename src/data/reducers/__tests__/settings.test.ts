import settings from 'data/reducers/settings';
import {
  CLEAR_EVENT_IDS,
  REMOVE_EVENT_ID_FOR_ASSIGNMENT,
  SET_EVENT_ID_FOR_ASSIGNMENT,
  SET_SETTING,
} from 'data/types/constants';
import { action, INIT } from '../../../../jest/actions';

describe('settings reducer', () => {
  const initial = settings(undefined, INIT);

  it('has the default settings', () => {
    expect(initial).toMatchInlineSnapshot(`
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
        "newUpdate": false,
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

  it('returns the same state for unknown actions', () => {
    expect(settings(initial, INIT)).toBe(initial);
  });

  it('replaces a primitive setting', () => {
    const state = settings(
      initial,
      action(SET_SETTING, { key: 'graduate', value: true }),
    );
    expect(state.graduate).toBe(true);
    expect(state.alarms).toBe(initial.alarms);
  });

  it('shallow-merges an object setting into the current value', () => {
    const state = settings(
      initial,
      action(SET_SETTING, {
        key: 'alarms',
        value: { courseAlarm: true, courseAlarmOffset: 15 },
      }),
    );
    expect(state.alarms).toEqual({
      ...initial.alarms,
      courseAlarm: true,
      courseAlarmOffset: 15,
    });
  });

  it('keeps an object setting when the new value is null', () => {
    // typeof null === 'object', so null is spread into the old value
    const state = settings(
      initial,
      action(SET_SETTING, { key: 'tabFilterSelections', value: null }),
    );
    expect(state.tabFilterSelections).toEqual(initial.tabFilterSelections);
  });

  it('sets a string setting that was previously unset', () => {
    expect(
      settings(
        initial,
        action(SET_SETTING, { key: 'courseCalendarId', value: 'cal-1' }),
      ).courseCalendarId,
    ).toBe('cal-1');
  });

  describe.each([
    ['calendar', 'syncedCalendarAssignments', 'syncedReminderAssignments'],
    ['reminder', 'syncedReminderAssignments', 'syncedCalendarAssignments'],
  ] as const)('%s event ids', (type, key, otherKey) => {
    const withOther = {
      ...initial,
      [otherKey]: { other: 'other-event' },
    };

    it('records and removes an event id per assignment', () => {
      let state = settings(
        withOther,
        action(SET_EVENT_ID_FOR_ASSIGNMENT, {
          type,
          assignmentId: 'a1',
          eventId: 'e1',
        }),
      );
      state = settings(
        state,
        action(SET_EVENT_ID_FOR_ASSIGNMENT, {
          type,
          assignmentId: 'a2',
          eventId: 'e2',
        }),
      );
      expect(state[key]).toEqual({ a1: 'e1', a2: 'e2' });

      state = settings(
        state,
        action(REMOVE_EVENT_ID_FOR_ASSIGNMENT, { type, assignmentId: 'a1' }),
      );
      expect(state[key]).toEqual({ a2: 'e2' });
      expect(state[otherKey]).toEqual({ other: 'other-event' });
    });

    it('clears all event ids of that type only', () => {
      const state = settings(
        { ...withOther, [key]: { a1: 'e1' } },
        action(CLEAR_EVENT_IDS, { type }),
      );
      expect(state[key]).toEqual({});
      expect(state[otherKey]).toEqual({ other: 'other-event' });
    });
  });
});
