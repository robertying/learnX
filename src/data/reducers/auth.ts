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
    username: null,
    password: null,
    fingerPrint: null,
    fingerGenPrint: null,
    fingerGenPrint3: null,
  },
  action: AuthAction,
): AuthState {
  switch (action.type) {
    case LOGIN_REQUEST:
      if (action.payload.clearCredential) {
        return {
          ...state,
          loggingIn: true,
          error: null,
          username: null,
          password: null,
          fingerPrint: null,
          fingerGenPrint: null,
          fingerGenPrint3: null,
        };
      }
      return {
        ...state,
        loggingIn: true,
        error: null,
      };
    case LOGIN_SUCCESS:
      const payload = action.payload;
      if (payload) {
        return {
          ...state,
          loggingIn: false,
          loggedIn: true,
          username: payload.username,
          password: payload.password,
          fingerPrint: payload.fingerPrint,
          fingerGenPrint: payload.fingerGenPrint,
          fingerGenPrint3: payload.fingerGenPrint3,
          error: null,
        };
      } else {
        return {
          ...state,
          loggingIn: false,
          loggedIn: true,
          error: null,
        };
      }
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
