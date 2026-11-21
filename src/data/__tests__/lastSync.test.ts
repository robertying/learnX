import { act, renderHook } from '@testing-library/react-native';
import { getLastSyncAt, useLastSyncAt } from 'data/lastSync';
import { queryClient } from 'data/queryClient';
import { queryKeys } from 'data/queryKeys';
import { resetUserData, useUserDataStore } from 'data/userData';

const semesterId = '2026-2027-1';

const fetched = (key: readonly string[], updatedAt: number) =>
  queryClient.setQueryData(key, [], { updatedAt });

afterEach(() => {
  queryClient.clear();
  resetUserData();
});

it('is the oldest fetch of the courses, notices, assignments and files', () => {
  fetched(queryKeys.courses(semesterId), 12);
  fetched(queryKeys.content('notices', semesterId), 50);
  fetched(queryKeys.content('assignments', semesterId), 13);
  fetched(queryKeys.content('files', semesterId), 40);
  expect(getLastSyncAt(semesterId)).toBe(12);
});

it("leaves out lists never fetched and other semesters' lists", () => {
  fetched(queryKeys.content('notices', semesterId), 50);
  fetched(queryKeys.content('files', '2025-2026-2'), 1);
  expect(getLastSyncAt(semesterId)).toBe(50);
});

it('is 0 with nothing fetched or no semester', () => {
  expect(getLastSyncAt(semesterId)).toBe(0);
  fetched(queryKeys.courses(semesterId), 12);
  expect(getLastSyncAt(null)).toBe(0);
});

it('follows the cache and the semester being shown', async () => {
  useUserDataStore.setState({ currentSemester: semesterId });
  fetched(queryKeys.courses(semesterId), 10);
  fetched(queryKeys.content('notices', semesterId), 20);
  const { result } = await renderHook(() => useLastSyncAt());
  expect(result.current).toBe(10);

  await act(() => fetched(queryKeys.courses(semesterId), 30));
  expect(result.current).toBe(20);

  await act(() => useUserDataStore.setState({ currentSemester: 'other' }));
  expect(result.current).toBe(0);
});
