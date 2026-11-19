import { loginRetryDelay, retriesOnTimer } from 'helpers/loginRetry';

it('waits longer and longer, up to a limit, for each failure', () => {
  expect([0, 1, 2, 3, 9].map(n => loginRetryDelay(n, 'offline'))).toEqual([
    30_000, 60_000, 120_000, 300_000, 300_000,
  ]);
  expect([0, 1, 2, 3, 9].map(n => loginRetryDelay(n, 'serverError'))).toEqual([
    60_000, 300_000, 900_000, 1_800_000, 1_800_000,
  ]);
});

it('retries only a login that got no answer or a server error', () => {
  expect(retriesOnTimer('offline')).toBe(true);
  expect(retriesOnTimer('serverError')).toBe(true);
  expect(retriesOnTimer('badCredential')).toBe(false);
  expect(retriesOnTimer('untrustedDevice')).toBe(false);
  expect(retriesOnTimer('failed')).toBe(false);
  expect(retriesOnTimer(null)).toBe(false);
});
