import { FailReason } from 'thu-learn-lib';
import auth from 'data/reducers/auth';
import {
  LOGIN_FAILURE,
  LOGIN_REQUEST,
  LOGIN_SUCCESS,
  SET_SSO_IN_PROGRESS,
} from 'data/types/constants';
import { AuthState } from 'data/types/state';
import { action, INIT } from '../../../../jest/actions';

const loggedIn: AuthState = {
  loggingIn: false,
  ssoInProgress: false,
  loggedIn: true,
  error: null,
};

describe('auth reducer', () => {
  it('starts logged out', () => {
    expect(auth(undefined, INIT)).toEqual({
      loggingIn: false,
      ssoInProgress: false,
      loggedIn: false,
    });
  });

  it('clears the last error on a login request', () => {
    expect(
      auth(
        { ...loggedIn, error: FailReason.BAD_CREDENTIAL },
        action(LOGIN_REQUEST),
      ),
    ).toEqual({ ...loggedIn, loggingIn: true, error: null });
  });

  it('marks a successful login', () => {
    expect(
      auth(
        { ...loggedIn, loggedIn: false, loggingIn: true },
        action(LOGIN_SUCCESS),
      ),
    ).toEqual(loggedIn);
  });

  it('records the reason of a failed login', () => {
    expect(
      auth(
        { ...loggedIn, loggingIn: true },
        action(LOGIN_FAILURE, { reason: FailReason.BAD_CREDENTIAL }),
      ),
    ).toEqual({
      ...loggedIn,
      loggingIn: false,
      loggedIn: false,
      error: FailReason.BAD_CREDENTIAL,
    });
  });

  it('tracks SSO progress', () => {
    const state = auth(
      loggedIn,
      action(SET_SSO_IN_PROGRESS, { ssoInProgress: true }),
    );
    expect(state.ssoInProgress).toBe(true);
    expect(
      auth(state, action(SET_SSO_IN_PROGRESS, { ssoInProgress: false }))
        .ssoInProgress,
    ).toBe(false);
  });

  it('returns the same state for unknown actions', () => {
    expect(auth(loggedIn, INIT)).toBe(loggedIn);
  });
});
