import { AuthAction } from 'data/types/actions';
import {
  LOGIN_FAILURE,
  LOGIN_REQUEST,
  LOGIN_SUCCESS,
  SET_SSO_IN_PROGRESS,
} from 'data/types/constants';
import { AuthState } from 'data/types/state';

export default function auth(
  state: AuthState = {
    loggingIn: false,
    ssoInProgress: false,
    loggedIn: false,
  },
  action: AuthAction,
): AuthState {
  switch (action.type) {
    case LOGIN_REQUEST:
      return {
        ...state,
        loggingIn: true,
        error: null,
      };
    case LOGIN_SUCCESS:
      return {
        ...state,
        loggingIn: false,
        loggedIn: true,
        error: null,
      };
    case LOGIN_FAILURE:
      return {
        ...state,
        loggingIn: false,
        loggedIn: false,
        error: action.payload.reason,
      };
    case SET_SSO_IN_PROGRESS:
      return {
        ...state,
        ssoInProgress: action.payload.ssoInProgress,
      };
    default:
      return state;
  }
}
