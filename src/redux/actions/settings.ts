import {createAction} from 'typesafe-actions';
import {
  SET_SETTING,
  SET_EVENT_ID_FOR_ASSIGNMENT,
  CLEAR_EVENT_IDS,
} from '../types/constants';
import {ISettingsState} from '../types/state';

export const setSetting = createAction(
  SET_SETTING,
  <T extends keyof ISettingsState>(key: T, value: ISettingsState[T]) => ({
    key,
    value,
  }),
)();

export const setEventIdForAssignment = createAction(
  SET_EVENT_ID_FOR_ASSIGNMENT,
  (assignmentId: string, eventId: string) => ({[assignmentId]: eventId}),
)();

export const clearEventIds = createAction(CLEAR_EVENT_IDS)();
