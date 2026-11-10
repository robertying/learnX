import { FailReason } from '@robertying/thu-learn-lib';
import { errorReason, isBadCredential, isNetworkError } from 'helpers/errors';

describe('errorReason', () => {
  it('reads the reason of an ApiError without changing it', () => {
    const error = { reason: FailReason.NOT_LOGGED_IN, extra: { code: 401 } };
    expect(errorReason(error)).toBe(FailReason.NOT_LOGGED_IN);
    expect(error.extra).toEqual({ code: 401 });
  });

  it('maps any other error to UNEXPECTED_STATUS', () => {
    expect(errorReason(new Error('boom'))).toBe(FailReason.UNEXPECTED_STATUS);
    expect(errorReason(null)).toBe(FailReason.UNEXPECTED_STATUS);
  });
});

describe('isNetworkError', () => {
  it('spots a request without an answer, bare or wrapped', () => {
    const offline = {
      reason: FailReason.NETWORK_ERROR,
      extra: new TypeError('Network request failed'),
    };
    expect(isNetworkError(offline)).toBe(true);
    expect(
      isNetworkError({
        reason: FailReason.ERROR_FETCH_FROM_ID,
        extra: offline,
      }),
    ).toBe(true);
  });

  it('counts a thu-learn-lib timeout, bare or wrapped', () => {
    const timeout = {
      reason: FailReason.REQUEST_TIMEOUT,
      extra: { url: 'https://learn.tsinghua.edu.cn', timeout: 60000 },
    };
    expect(isNetworkError(timeout)).toBe(true);
    expect(
      isNetworkError({
        reason: FailReason.ERROR_FETCH_FROM_ID,
        extra: timeout,
      }),
    ).toBe(true);
  });

  it('does not count other failures', () => {
    expect(
      isNetworkError({
        reason: FailReason.ERROR_FETCH_FROM_ID,
        extra: new TypeError(
          "Cannot read properties of undefined (reading 'split')",
        ),
      }),
    ).toBe(false);
    expect(isNetworkError({ reason: FailReason.BAD_CREDENTIAL })).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});

describe('isBadCredential', () => {
  it('spots a wrong password only', () => {
    expect(isBadCredential({ reason: FailReason.BAD_CREDENTIAL })).toBe(true);
    expect(isBadCredential({ reason: FailReason.ERROR_FETCH_FROM_ID })).toBe(
      false,
    );
    expect(isBadCredential(null)).toBe(false);
  });
});
