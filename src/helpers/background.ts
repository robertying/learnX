import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { loginWithFingerPrint } from 'data/source';
import { loadCredentials } from 'data/credentials';
import { coursesQuery } from 'data/queries';
import { queryClient, restoreQueryCache } from 'data/queryClient';
import { getUserData } from 'data/userData';
import { assignmentsQuery, filesQuery, noticesQuery } from 'data/content';

const FETCH_ALL_CONTENT_TASK = 'FETCH_ALL_CONTENT_TASK';

TaskManager.defineTask(FETCH_ALL_CONTENT_TASK, async () => {
  // The task can run before the app UI has loaded them.
  const [credentials] = await Promise.all([
    loadCredentials(),
    restoreQueryCache(),
  ]);
  const semesterId = getUserData().currentSemester;
  const courseIds = (
    (semesterId &&
      queryClient.getQueryData(coursesQuery(semesterId).queryKey)) ||
    []
  ).map(course => course.id);

  if (
    !semesterId ||
    !credentials?.username ||
    !credentials.password ||
    !credentials.fingerPrint ||
    courseIds.length === 0
  ) {
    return BackgroundTask.BackgroundTaskResult.Success;
  }

  try {
    await loginWithFingerPrint(
      credentials.username,
      credentials.password,
      credentials.fingerPrint,
      credentials.fingerGenPrint,
      credentials.fingerGenPrint3,
    );
  } catch {
    return BackgroundTask.BackgroundTaskResult.Success;
  }

  // Fetched afresh even when the cached lists are recent.
  const results = await Promise.allSettled([
    queryClient.fetchQuery({ ...noticesQuery(semesterId), staleTime: 0 }),
    queryClient.fetchQuery({ ...assignmentsQuery(semesterId), staleTime: 0 }),
    queryClient.fetchQuery({ ...filesQuery(semesterId), staleTime: 0 }),
  ]);

  if (results.some(result => result.status === 'fulfilled')) {
    return BackgroundTask.BackgroundTaskResult.Success;
  } else {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export const setUpBackgroundFetch = async () => {
  await BackgroundTask.registerTaskAsync(FETCH_ALL_CONTENT_TASK, {
    minimumInterval: 15,
  });
};
