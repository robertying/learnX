import { IAuthAction } from "../types/actions";
import {
  LOGIN_FAILURE,
  LOGIN_REQUEST,
  LOGIN_SUCCESS
} from "../types/constants";
import { IAuthState } from "../types/state";

export default function auth(
  state: IAuthState = {
    loggingIn: false,
    loggedIn: false,
    username: null,
    password: null
  },
  action: IAuthAction
): IAuthState {
  switch (action.type) {
    case LOGIN_REQUEST:
      return {
        ...state,
        loggingIn: true,
        error: null
      };
    case LOGIN_SUCCESS:
      const payload = action.payload;
      return {
        ...state,
        loggingIn: false,
        loggedIn: true,
        username: payload.username,
        password: payload.password,
        error: null
      };
    case LOGIN_FAILURE:
      return {
        ...state,
        loggingIn: false,
        loggedIn: false,
        error: action.payload
      };
  }
  return state;
}
