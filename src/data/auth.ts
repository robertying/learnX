import { FailReason } from '@robertying/thu-learn-lib';
import { create } from 'zustand';
import { isBadCredential } from 'helpers/errors';

/**
 * Why the saved login didn't go through: `offline` when the school's server
 * can't be reached at all, `rejected` when it answered but the login failed
 * (a changed password, a revoked device, a server error). The app keeps
 * showing the saved data either way.
 */
export type LoginFailure = 'offline' | 'rejected';

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
  /** Set once a failed login has been told apart; null while logged in. */
  failure: LoginFailure | null;
  /** The user asked to log in again from the main UI. */
  reloginRequested: boolean;
}

export const initialAuth: AuthState = {
  loggingIn: false,
  ssoInProgress: false,
  loggedIn: false,
  error: null,
  failure: null,
  reloginRequested: false,
};

export const useAuthStore = create<AuthState>()(() => initialAuth);

export const getAuth = () => useAuthStore.getState();

/** Queries run only while logged in; their cached data shows meanwhile. */
export const useLoggedIn = () => useAuthStore(state => state.loggedIn);
export const useLoggingIn = () => useAuthStore(state => state.loggingIn);
export const useLoginError = () => useAuthStore(state => state.error);
export const useLoginFailure = () => useAuthStore(state => state.failure);
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
 * Notes a failed request. thu-learn-lib logs in again by itself when a request
 * finds the session expired; when that login is turned down for a wrong
 * password (changed since it was saved), the session is gone, so the lists say
 * the login failed and offer to log in again, as after a failed login at
 * launch. Other errors are the request's own.
 */
export const noteRequestError = (error: unknown) => {
  if (isBadCredential(error) && getAuth().loggedIn) {
    useAuthStore.setState({
      loggedIn: false,
      loggingIn: false,
      error: FailReason.BAD_CREDENTIAL,
      failure: 'rejected',
    });
  }
};
