import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import DeviceInfo from 'constants/DeviceInfo';
import { assignmentsQuery, filesQuery, noticesQuery } from 'data/content';
import { mockCurrentSemester } from 'data/mock';
import {
  defaultMockNetworkConfig,
  setMockNetworkConfig,
} from 'data/mockSource';
import { coursesQuery } from 'data/queries';
import { queryClient } from 'data/queryClient';
import { ensureSession } from 'data/source';
import { useSyncLogStore } from 'data/syncLog';
import { setCurrentSemester } from 'data/userData';
import { SYNC_BUDGET_MS, setUpBackgroundFetch } from 'services/background';
import { checkForUpdate } from 'services/updateNotifications';

jest.mock('expo-background-task', () => ({
  BackgroundTaskResult: { Success: 1, Failed: 2 },
  registerTaskAsync: jest.fn(),
}));
jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }));
jest.mock('services/updateNotifications', () => ({
  checkForUpdate: jest.fn(() => Promise.resolve()),
}));
jest.mock('services/crashReporting', () => ({
  recordError: jest.fn(),
  setCustomKey: jest.fn(),
}));
jest.mock('data/source', () => ({
  dataSource: require('data/mockSource').mockSource,
  ensureSession: jest.fn(() => Promise.resolve()),
}));
jest.mock('data/credentials', () => ({
  ...jest.requireActual('data/credentials'),
  loadCredentials: () =>
    Promise.resolve({
      username: 'user',
      password: 'password',
      fingerPrint: 'fp',
    }),
}));

// Defined on import; read before the calls are cleared.
const backgroundTask = jest.mocked(TaskManager.defineTask).mock.calls[0][1];

// A fresh module: the Mac's timer is started once per JS runtime.
it('syncs on its own timer on the Mac, with more time than a system task', async () => {
  jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
  setMockNetworkConfig({ ...defaultMockNetworkConfig, latency: 'none' });
  setCurrentSemester(mockCurrentSemester);
  await queryClient.fetchQuery(coursesQuery(mockCurrentSemester));
  await queryClient.fetchQuery(noticesQuery(mockCurrentSemester));
  await queryClient.fetchQuery(assignmentsQuery(mockCurrentSemester));
  await queryClient.fetchQuery(filesQuery(mockCurrentSemester));

  jest.useFakeTimers();
  // Logging in takes longer than a system task's whole budget.
  jest
    .mocked(ensureSession)
    .mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, SYNC_BUDGET_MS + 5_000)),
    );
  // Each new primary window sets it up again.
  await setUpBackgroundFetch();
  await setUpBackgroundFetch();
  expect(BackgroundTask.registerTaskAsync).not.toHaveBeenCalled();

  await jest.advanceTimersByTimeAsync(15 * 60_000 - 1);
  expect(checkForUpdate).not.toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(1);
  expect(checkForUpdate).toHaveBeenCalledTimes(1);

  // A system task that comes during the run waits for it instead of
  // starting another.
  const task = backgroundTask({} as never);
  await jest.advanceTimersByTimeAsync(SYNC_BUDGET_MS + 10_000);
  expect(await task).toBe(BackgroundTask.BackgroundTaskResult.Success);
  expect(checkForUpdate).toHaveBeenCalledTimes(1);
  expect(useSyncLogStore.getState().runs).toEqual([
    expect.objectContaining({ status: 'synced' }),
  ]);

  // One timer, however often it was set up.
  await jest.advanceTimersByTimeAsync(15 * 60_000);
  expect(checkForUpdate).toHaveBeenCalledTimes(2);
});
