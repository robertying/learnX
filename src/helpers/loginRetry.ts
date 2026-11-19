import type { LoginFailure } from 'helpers/errors';

/**
 * Seconds between quiet login retries, by why the login failed. Offline: 30 s,
 * 1 m, 2 m, then 5 m, so a connection that comes back is noticed soon. Server
 * errors: 1 m, 5 m, 15 m, then 30 m, since an outage tends to last and every
 * try is a few requests to a server that's struggling. Refused logins aren't
 * retried at all (`helpers/errors`).
 */
const RETRY_DELAYS: Record<'offline' | 'serverError', readonly number[]> = {
  offline: [30, 60, 120, 300],
  serverError: [60, 300, 900, 1800],
};

/** Whether a failed login is retried on a timer. */
export const retriesOnTimer = (
  failure: LoginFailure | null,
): failure is 'offline' | 'serverError' =>
  failure === 'offline' || failure === 'serverError';

/**
 * How long to wait before the given retry (counted from 0) after a failure
 * that `retriesOnTimer`.
 */
export const loginRetryDelay = (
  attempt: number,
  failure: 'offline' | 'serverError',
) => {
  const delays = RETRY_DELAYS[failure];
  return delays[Math.min(attempt, delays.length - 1)] * 1000;
};
