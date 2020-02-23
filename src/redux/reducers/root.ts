import {dummyUsername} from '../../constants/Dummy';
import mockStore from '../mockStore';
import {appReducer} from '../store';
import {IAppActions} from '../types/actions';
import {CLEAR_STORE, SET_MOCK_STORE, RESET_LOADING} from '../types/constants';
import {IAppState} from '../types/state';
import assignments from './assignments';
import courses from './courses';
import currentSemester from './currentSemester';
import files from './files';
import notices from './notices';
import semesters from './semesters';
import settings from './settings';

export const mainReducers = {
  settings,
  assignments,
  courses,
  currentSemester,
  files,
  notices,
  semesters,
};

export function rootReducer(
  state: IAppState | undefined,
  action: IAppActions,
): IAppState {
  if (state && action.type === RESET_LOADING) {
    return {
      ...state,
      auth: {
        ...state.auth,
        loggingIn: false,
      },
      semesters: {
        ...state.semesters,
        isFetching: false,
      },
      courses: {
        ...state.courses,
        isFetching: false,
      },
      notices: {
        ...state.notices,
        isFetching: false,
      },
      files: {
        ...state.files,
        isFetching: false,
      },
      assignments: {
        ...state.assignments,
        isFetching: false,
      },
    };
  }

  if (action.type === SET_MOCK_STORE) {
    return mockStore;
  } else if (action.type === CLEAR_STORE) {
    state = undefined;
  } else if (state && state.auth.username === dummyUsername) {
    return state;
  }
  return appReducer(state, action);
}
