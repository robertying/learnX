import { FailReason, isRefusedLogin } from '@robertying/thu-learn-lib';
import { create } from 'zustand';
import { errorReason, loginFailureOf, type LoginFailure } from 'helpers/errors';

/**
 * Login progress. Not persisted: it only means something while the app runs.
 * The credentials are saved by data/credentials.
 */
export interface AuthState {
  loggingIn: boolean;
  ssoInProgress: boolean;
  /** A session is open, so queries can run. */
  loggedIn: boolean;
  error: FailReason | null;
  /** Debug builds: what the server answered to the failed login. */
  errorDetail: string | null;
  /**
   * Why the saved login didn't go through, once told apart; null while logged
   * in. The app keeps showing the saved data whatever it is.
   */
  failure: LoginFailure | null;
  /** The user asked to log in again from the main UI. */
  reloginRequested: boolean;
  /**
   * The session's CSRF token, empty without one. Every login changes it,
   * thu-learn-lib's own for an expired session too, so web content that loads
   * from Web Learning knows to load again (`useWebSession`).
   */
  sessionToken: string;
}

export const initialAuth: AuthState = {
  loggingIn: false,
  ssoInProgress: false,
  loggedIn: false,
  error: null,
  errorDetail: null,
  failure: null,
  reloginRequested: false,
  sessionToken: '',
};

export const useAuthStore = create<AuthState>()(() => initialAuth);

export const getAuth = () => useAuthStore.getState();

/** Queries run only while logged in; their cached data shows meanwhile. */
export const useLoggedIn = () => useAuthStore(state => state.loggedIn);
export const useLoggingIn = () => useAuthStore(state => state.loggingIn);
export const useReloginRequested = () =>
  useAuthStore(state => state.reloginRequested);

export const setSSOInProgress = (ssoInProgress: boolean) =>
  useAuthStore.setState({ ssoInProgress });

/** Shows the login screen in place of the saved data. */
export const requestRelogin = () =>
  useAuthStore.setState({ reloginRequested: true, error: null });

/** Goes back from the login screen to the saved data. */
export const cancelRelogin = () =>
  useAuthStore.setState({ reloginRequested: false });

/**
 * Notes the session's CSRF token after a login or a request (`dataSource`
 * calls it for every one, since thu-learn-lib logs in again by itself).
 */
export const noteSession = (sessionToken: string) => {
  if (getAuth().sessionToken !== sessionToken) {
    useAuthStore.setState({ sessionToken });
  }
};

/**
 * Notes a failed request (`dataSource` calls it for every one). thu-learn-lib
 * logs in again by itself when a request finds the session expired; when that
 * login is refused (a password changed since it was saved, or a device the SSO
 * server no longer trusts), the session is gone, so the lists say why and offer
 * to log in again, as after a refused login at launch. Other errors are the
 * request's own.
 */
export const noteRequestError = (error: unknown) => {
  if (isRefusedLogin(error) && getAuth().loggedIn) {
    useAuthStore.setState({
      loggedIn: false,
      loggingIn: false,
      error: errorReason(error),
      failure: loginFailureOf(error),
    });
  }
};
