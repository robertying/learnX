import {AuthAction} from 'data/types/actions';
import {
  LOGIN_FAILURE,
  LOGIN_REQUEST,
  LOGIN_SUCCESS,
} from 'data/types/constants';
import {AuthState} from 'data/types/state';

export default function auth(
  state: AuthState = {
    loggingIn: false,
    loggedIn: false,
    username: null,
    password: null,
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
      const payload = action.payload;
      return {
        ...state,
        loggingIn: false,
        loggedIn: true,
        username: payload.username,
        password: payload.password,
        error: null,
      };
    case LOGIN_FAILURE:
      return {
        ...state,
        loggingIn: false,
        loggedIn: false,
        error: action.payload.reason,
      };
    default:
      return state;
  }
}
