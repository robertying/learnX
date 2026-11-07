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
  username: 'user',
  password: 'pass',
  fingerPrint: 'fp',
  fingerGenPrint: 'fgp',
  fingerGenPrint3: 'fgp3',
  error: null,
};

describe('auth reducer', () => {
  it('starts logged out with no credentials', () => {
    expect(auth(undefined, INIT)).toEqual({
      loggingIn: false,
      ssoInProgress: false,
      loggedIn: false,
      username: null,
      password: null,
      fingerPrint: null,
      fingerGenPrint: null,
      fingerGenPrint3: null,
    });
  });

  it('keeps credentials on a plain login request', () => {
    expect(
      auth(
        { ...loggedIn, error: FailReason.BAD_CREDENTIAL },
        action(LOGIN_REQUEST, {}),
      ),
    ).toEqual({ ...loggedIn, loggingIn: true, error: null });
  });

  it('clears credentials on a login request with clearCredential', () => {
    expect(
      auth(loggedIn, action(LOGIN_REQUEST, { clearCredential: true })),
    ).toEqual({
      ...loggedIn,
      loggingIn: true,
      error: null,
      username: null,
      password: null,
      fingerPrint: null,
      fingerGenPrint: null,
      fingerGenPrint3: null,
    });
  });

  it('stores the credentials of a successful login', () => {
    const state = auth(
      undefined,
      action(LOGIN_SUCCESS, {
        username: 'u',
        password: 'p',
        fingerPrint: 'a',
        fingerGenPrint: 'b',
        fingerGenPrint3: 'c',
      }),
    );
    expect(state).toEqual({
      loggingIn: false,
      ssoInProgress: false,
      loggedIn: true,
      username: 'u',
      password: 'p',
      fingerPrint: 'a',
      fingerGenPrint: 'b',
      fingerGenPrint3: 'c',
      error: null,
    });
  });

  it('keeps existing credentials on a successful login without payload', () => {
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
