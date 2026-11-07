import { FailReason } from 'thu-learn-lib';
import { create } from 'zustand';

/**
 * Login progress. Not persisted: it only means something while the app runs.
 * The credentials are saved by data/credentials.
 */
export interface AuthState {
  loggingIn: boolean;
  ssoInProgress: boolean;
  loggedIn: boolean;
  error: FailReason | null;
}

export const initialAuth: AuthState = {
  loggingIn: false,
  ssoInProgress: false,
  loggedIn: false,
  error: null,
};

export const useAuthStore = create<AuthState>()(() => initialAuth);

export const getAuth = () => useAuthStore.getState();

/** Queries run only while logged in; their cached data shows meanwhile. */
export const useLoggedIn = () => useAuthStore(state => state.loggedIn);
export const useLoggingIn = () => useAuthStore(state => state.loggingIn);
export const useLoginError = () => useAuthStore(state => state.error);

export const setSSOInProgress = (ssoInProgress: boolean) =>
  useAuthStore.setState({ ssoInProgress });
