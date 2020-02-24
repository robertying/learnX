import {createAction, PayloadAction} from 'typesafe-actions';
import {
  SET_SETTING,
  SET_EVENT_ID_FOR_ASSIGNMENT,
  CLEAR_EVENT_IDS,
} from '../types/constants';
import {ISettingsState} from '../types/state';

export const setSetting: <T extends keyof ISettingsState>(
  key: T,
  value: ISettingsState[T],
) => PayloadAction<
  typeof SET_SETTING,
  {
    key: T;
    value: ISettingsState[T];
  }
> = createAction(SET_SETTING, (key, value) => ({
  key,
  value,
}))();

export const setEventIdForAssignment = createAction(
  SET_EVENT_ID_FOR_ASSIGNMENT,
  (assignmentId: string, eventId: string) => ({[assignmentId]: eventId}),
)();

export const clearEventIds = createAction(CLEAR_EVENT_IDS)();
