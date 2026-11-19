import {
  ApiError,
  FailReason,
  isConnectionError,
} from '@robertying/thu-learn-lib';

/** An ApiError's reason, or undefined for any other error. */
export const apiReason = (err: unknown): FailReason | undefined =>
  (!!err && typeof err === 'object' && (err as Partial<ApiError>).reason) ||
  undefined;

/** An ApiError's reason, or `UNEXPECTED_STATUS` for any other error. */
export const errorReason = (err: unknown): FailReason =>
  apiReason(err) ?? FailReason.UNEXPECTED_STATUS;

/**
 * Whether a request got no answer: no connection, or no answer in time
 * (thu-learn-lib's `isConnectionError`), also when it is wrapped in an
 * ApiError's `extra`.
 */
export const isNetworkError = (err: unknown): boolean =>
  isConnectionError(err) ||
  (!!err &&
    typeof err === 'object' &&
    isConnectionError((err as { extra?: unknown }).extra));

/**
 * Why a login didn't go through, as the app tells it apart:
 * - `offline`: no answer (no connection, or none in time);
 * - `serverError`: the school's servers answered with an error, or with a
 *   page the login doesn't expect, as when they're down or under maintenance;
 * - `badCredential`: the SSO server turned the password down, as after it was
 *   changed on the website;
 * - `untrustedDevice`: the SSO server took the password but no longer trusts
 *   the device fingerprint saved with it (it expired, or was removed from the
 *   account's trusted browsers), so it asks for a second factor;
 * - `failed`: anything else, such as a login SSO didn't capture.
 *
 * Only `offline` and `serverError` can go through by trying the same login
 * again; the refused ones (thu-learn-lib's `isRefusedLogin`) can't, and more wrong passwords
 * may lock the account.
 */
export type LoginFailure =
  | 'offline'
  | 'serverError'
  | 'badCredential'
  | 'untrustedDevice'
  | 'failed';

/** Which `LoginFailure` a failed login's error is. */
export const loginFailureOf = (err: unknown): LoginFailure => {
  if (isNetworkError(err)) {
    return 'offline';
  }
  switch (apiReason(err)) {
    case FailReason.BAD_CREDENTIAL:
      return 'badCredential';
    case FailReason.DEVICE_NOT_TRUSTED:
      return 'untrustedDevice';
    case FailReason.ERROR_FETCH_FROM_ID:
    case FailReason.ERROR_ROAMING:
    case FailReason.INVALID_RESPONSE:
    case FailReason.UNEXPECTED_STATUS:
    case FailReason.OPERATION_FAILED:
    case FailReason.NOT_LOGGED_IN:
      return 'serverError';
    default:
      return 'failed';
  }
};

/**
 * Whether a login failure is the server refusing the saved login itself: the
 * same login would only be refused again, so it waits for the user.
 */
export const isRefusal = (failure: LoginFailure | null | undefined) =>
  failure === 'badCredential' || failure === 'untrustedDevice';

/**
 * Whether the server answered and turned the request down (an unexpected
 * status, or a result other than success), as opposed to not being reached,
 * the session failing, or an error outside thu-learn-lib. An id the server
 * doesn't know answers HTTP 500, like a server that's down.
 */
export const isServerRejection = (err: unknown): boolean => {
  const reason = apiReason(err);
  return (
    reason === FailReason.UNEXPECTED_STATUS ||
    reason === FailReason.OPERATION_FAILED
  );
};
