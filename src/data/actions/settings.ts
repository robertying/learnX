import {createAction, PayloadAction} from 'typesafe-actions';
import {
  SET_SETTING,
  SET_EVENT_ID_FOR_ASSIGNMENT,
  CLEAR_EVENT_IDS,
  REMOVE_EVENT_ID_FOR_ASSIGNMENT,
} from 'data/types/constants';
import {SettingsState} from 'data/types/state';

export const setSetting: <T extends keyof SettingsState>(
  key: T,
  value: Partial<SettingsState[T]>,
) => PayloadAction<
  typeof SET_SETTING,
  {
    key: T;
    value: SettingsState[T];
  }
> = createAction(SET_SETTING, (key, value) => ({
  key,
  value,
}))();

export const setEventIdForAssignment = createAction(
  SET_EVENT_ID_FOR_ASSIGNMENT,
  (type: 'calendar' | 'reminder', assignmentId: string, eventId: string) => ({
    type,
    assignmentId,
    eventId,
  }),
)();

export const removeEventIdForAssignment = createAction(
  REMOVE_EVENT_ID_FOR_ASSIGNMENT,
  (type: 'calendar' | 'reminder', assignmentId: string) => ({
    type,
    assignmentId,
  }),
)();

export const clearEventIds = createAction(
  CLEAR_EVENT_IDS,
  (type: 'calendar' | 'reminder') => ({type}),
)();
