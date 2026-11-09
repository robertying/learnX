import { FailReason } from '@robertying/thu-learn-lib';
import {
  getAuth,
  initialAuth,
  noteRequestError,
  useAuthStore,
} from 'data/auth';

beforeEach(() => {
  useAuthStore.setState({ ...initialAuth, loggedIn: true });
});

describe('noteRequestError', () => {
  it('ends the session when a login inside a request is turned down', () => {
    noteRequestError({ reason: FailReason.BAD_CREDENTIAL });
    expect(getAuth()).toMatchObject({
      loggedIn: false,
      error: FailReason.BAD_CREDENTIAL,
      failure: 'rejected',
    });
  });

  it('leaves the session alone for other errors', () => {
    noteRequestError({ reason: FailReason.UNEXPECTED_STATUS });
    noteRequestError(new TypeError('Network request failed'));
    expect(getAuth()).toMatchObject({ loggedIn: true, failure: null });
  });

  it('does nothing without a session', () => {
    useAuthStore.setState(initialAuth);
    noteRequestError({ reason: FailReason.BAD_CREDENTIAL });
    expect(getAuth()).toEqual(initialAuth);
  });
});
