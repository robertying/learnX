import { combineReducers } from 'redux';
import { AppActions, StoreAction } from 'data/types/actions';
import { CLEAR_STORE, SET_MOCK_STORE } from 'data/types/constants';
import { AppState } from 'data/types/state';
import assignments from './assignments';
import courses from './courses';
import files from './files';
import notices from './notices';
import semesters from './semesters';
import auth from './auth';
import user from './user';

const getMockStore = () => require('data/mock').default;

export const mainReducers = {
  user,
  semesters,
  courses,
  notices,
  assignments,
  files,
};

const appReducer = combineReducers({
  // Not persisted: login progress only means something while the app runs.
  // The credentials are saved by data/credentials.
  auth,
  ...mainReducers,
});

export function rootReducer(
  state: AppState | undefined,
  action: AppActions,
): AppState {
  if (action.type === SET_MOCK_STORE) {
    return getMockStore();
  } else if (action.type === CLEAR_STORE) {
    state = undefined;
  }
  return appReducer(state, action as Exclude<AppActions, StoreAction>);
}
