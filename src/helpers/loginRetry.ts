/** Seconds between quiet login retries while offline: 30 s, 1 m, 2 m, then 5 m. */
const RETRY_DELAYS = [30, 60, 120, 300];

/** How long to wait before the given retry (0 for the first one). */
export const loginRetryDelay = (attempt: number) =>
  RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)] * 1000;
