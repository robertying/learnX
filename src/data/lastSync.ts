import { useSyncExternalStore } from 'react';
import { queryClient } from 'data/queryClient';
import { queryKeys } from 'data/queryKeys';
import { contentListNames } from 'data/types/state';
import { useCurrentSemester } from 'data/userData';

/**
 * When the semester's data was last brought up to date (ms), 0 if never: the
 * oldest fetch time of its courses and its notices, assignments and files,
 * which every screen is built from. Each list is refreshed on its own (by its
 * tab, by Today, by the background sync), so one list's time differs from
 * screen to screen; the oldest is how fresh all of it is, and every screen
 * says the same. A list never fetched has nothing to date and is left out.
 * The timetable's weeks aren't counted: a week is fetched only when it's
 * shown, and Today says when its week failed.
 */
export const getLastSyncAt = (semesterId: string | null | undefined) => {
  if (!semesterId) {
    return 0;
  }
  const times = [
    queryKeys.courses(semesterId),
    ...contentListNames.map(name => queryKeys.content(name, semesterId)),
  ]
    .map(key => queryClient.getQueryState(key)?.dataUpdatedAt ?? 0)
    .filter(time => time > 0);
  return times.length > 0 ? Math.min(...times) : 0;
};

const subscribe = (onChange: () => void) =>
  queryClient.getQueryCache().subscribe(onChange);

/** `getLastSyncAt` of the semester being shown, kept current. */
export const useLastSyncAt = () => {
  const semesterId = useCurrentSemester();
  return useSyncExternalStore(subscribe, () => getLastSyncAt(semesterId));
};
