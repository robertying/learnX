import {createAction} from 'typesafe-actions';
import {SET_CURRENT_SEMESTER} from '../types/constants';

export const setCurrentSemester = createAction(
  SET_CURRENT_SEMESTER,
  (semesterId: string) => semesterId,
)();
