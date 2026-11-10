import {
  ApiError,
  FailReason,
  isConnectionError,
} from '@robertying/thu-learn-lib';

/** An ApiError's reason, or `UNEXPECTED_STATUS` for any other error. */
export const errorReason = (err: unknown): FailReason =>
  (!!err && typeof err === 'object' && (err as Partial<ApiError>).reason) ||
  FailReason.UNEXPECTED_STATUS;

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

/** Whether thu-learn-lib rejected a login for a wrong username or password. */
export const isBadCredential = (err: unknown): boolean =>
  errorReason(err) === FailReason.BAD_CREDENTIAL;
