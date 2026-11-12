import type { AppStateStatus } from 'react-native';
import { CancelledError } from '@tanstack/react-query';

/**
 * Saving lists changed in place. The module listens to the app state as it
 * loads, so the listener is caught before it is required.
 */

let appStateListener: (state: AppStateStatus) => void = () => {};
jest
  .spyOn(require('react-native').AppState, 'addEventListener')
  .mockImplementation((...args: unknown[]) => {
    appStateListener = args[1] as typeof appStateListener;
    return { remove: () => {} };
  });

const {
  clearQueryCache,
  queryClient,
  queryPersister,
  saveQuerySoon,
}: typeof import('data/queryClient') = require('data/queryClient');

const key = ['notice', '2026-2027-1'];

/** What the next launch would load for the list. */
const saved = async () => {
  queryClient.clear();
  await queryPersister.restoreQueries(queryClient);
  return queryClient.getQueryData(key);
};

beforeEach(() => {
  jest.useFakeTimers();
  clearQueryCache();
});
afterEach(() => jest.useRealTimers());

it('saves a list changed in place a moment later', async () => {
  queryClient.setQueryData(key, ['read']);
  saveQuerySoon(key);
  saveQuerySoon(key);
  expect(await saved()).toBeUndefined();

  queryClient.setQueryData(key, ['read']);
  saveQuerySoon(key);
  await jest.advanceTimersByTimeAsync(1000);
  expect(await saved()).toEqual(['read']);
});

it('saves at once when the app leaves the foreground, and only with changes', async () => {
  queryClient.setQueryData(key, ['read']);
  saveQuerySoon(key);
  appStateListener('active');
  expect(await saved()).toBeUndefined();

  queryClient.setQueryData(key, ['read']);
  saveQuerySoon(key);
  appStateListener('background');
  await jest.advanceTimersByTimeAsync(0);
  expect(await saved()).toEqual(['read']);

  // Nothing waiting: leaving again writes nothing.
  clearQueryCache();
  appStateListener('background');
  expect(await saved()).toBeUndefined();
});

it("doesn't write back a response that arrives as the cache is cleared", async () => {
  let respond: (value: string[]) => void = () => {};
  const fetching = queryClient
    .fetchQuery({
      queryKey: key,
      queryFn: () => new Promise<string[]>(resolve => (respond = resolve)),
    })
    .catch((err: unknown) => err);
  await jest.advanceTimersByTimeAsync(0);

  // Logged out with the fetch still running: clearing cancels the query, but
  // the request itself still comes back.
  clearQueryCache();
  expect(await fetching).toBeInstanceOf(CancelledError);
  respond(['old account']);
  await jest.advanceTimersByTimeAsync(0);
  expect(await saved()).toBeUndefined();

  // Arrived, then logged out before its write, and the list asked for again
  await queryClient.fetchQuery({ queryKey: key, queryFn: () => ['old'] });
  clearQueryCache();
  const refetching = queryClient
    .fetchQuery({ queryKey: key, queryFn: () => new Promise(() => {}) })
    .catch((err: unknown) => err);
  await jest.advanceTimersByTimeAsync(0);
  expect(await saved()).toBeUndefined();
  expect(await refetching).toBeInstanceOf(CancelledError);

  // Written as usual otherwise
  await queryClient.fetchQuery({ queryKey: key, queryFn: () => ['new'] });
  await jest.advanceTimersByTimeAsync(0);
  expect(await saved()).toEqual(['new']);
});
