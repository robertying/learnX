import { FailReason } from '@robertying/thu-learn-lib';
import {
  apiReason,
  errorReason,
  isBadCredential,
  isNetworkError,
  isServerRejection,
} from 'helpers/errors';

describe('apiReason', () => {
  it('reads the reason of an ApiError only', () => {
    expect(apiReason({ reason: FailReason.NETWORK_ERROR })).toBe(
      FailReason.NETWORK_ERROR,
    );
    expect(apiReason(new Error('boom'))).toBeUndefined();
    expect(apiReason(null)).toBeUndefined();
  });
});

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

describe('isServerRejection', () => {
  it('spots an answer that turned the request down', () => {
    expect(isServerRejection({ reason: FailReason.UNEXPECTED_STATUS })).toBe(
      true,
    );
    expect(isServerRejection({ reason: FailReason.OPERATION_FAILED })).toBe(
      true,
    );
  });

  it('does not count no answer, an expired session or other errors', () => {
    expect(isServerRejection({ reason: FailReason.NETWORK_ERROR })).toBe(false);
    expect(isServerRejection({ reason: FailReason.NOT_LOGGED_IN })).toBe(false);
    expect(isServerRejection(new Error('boom'))).toBe(false);
    expect(isServerRejection(null)).toBe(false);
  });
});
