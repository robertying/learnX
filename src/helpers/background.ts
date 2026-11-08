import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { loginWithFingerPrint } from 'data/source';
import { loadCredentials } from 'data/credentials';
import { coursesQuery } from 'data/queries';
import { queryClient, restoreQueryCache } from 'data/queryClient';
import { getUserData } from 'data/userData';
import { assignmentsQuery, filesQuery, noticesQuery } from 'data/content';
import { ContentDiff, diffContent } from 'data/contentDiff';
import { updateDeadlineWidget } from 'widgets';

export type SyncResult =
  /** Not logged in, no courses cached yet, or the login failed. */
  | { status: 'skipped' }
  /** Every list failed to fetch. */
  | { status: 'failed' }
  /** At least one list was fetched; `diff` is what changed in those. */
  | { status: 'synced'; diff: ContentDiff };

/**
 * Logs in and refetches the current semester's notices, assignments and files
 * with the queries the screens use, so the app shows them at its next launch
 * and the persisted cache is up to date. Returns what changed.
 */
export const syncContent = async (): Promise<SyncResult> => {
  // The task can run before the app UI has loaded them.
  const [credentials] = await Promise.all([
    loadCredentials(),
    restoreQueryCache(),
  ]);
  const semesterId = getUserData().currentSemester;
  const courses =
    semesterId && queryClient.getQueryData(coursesQuery(semesterId).queryKey);

  if (
    !semesterId ||
    !credentials?.username ||
    !credentials.password ||
    !credentials.fingerPrint ||
    !courses?.length
  ) {
    return { status: 'skipped' };
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
    return { status: 'skipped' };
  }

  const queries = {
    notices: noticesQuery(semesterId),
    assignments: assignmentsQuery(semesterId),
    files: filesQuery(semesterId),
  };
  const before = {
    notices: queryClient.getQueryData(queries.notices.queryKey),
    assignments: queryClient.getQueryData(queries.assignments.queryKey),
    files: queryClient.getQueryData(queries.files.queryKey),
  };

  // Fetched afresh even when the cached lists are recent.
  const [notices, assignments, files] = await Promise.allSettled([
    queryClient.fetchQuery({ ...queries.notices, staleTime: 0 }),
    queryClient.fetchQuery({ ...queries.assignments, staleTime: 0 }),
    queryClient.fetchQuery({ ...queries.files, staleTime: 0 }),
  ]);
  const value = <T>(result: PromiseSettledResult<T>) =>
    result.status === 'fulfilled' ? result.value : undefined;
  const after = {
    notices: value(notices),
    assignments: value(assignments),
    files: value(files),
  };

  if (!after.notices && !after.assignments && !after.files) {
    return { status: 'failed' };
  }
  if (after.assignments) {
    const { hiddenCourses, archived } = getUserData();
    updateDeadlineWidget(after.assignments, {
      hiddenCourses,
      archived: archived.assignment,
    });
  }
  return { status: 'synced', diff: diffContent(before, after) };
};

const FETCH_ALL_CONTENT_TASK = 'FETCH_ALL_CONTENT_TASK';

TaskManager.defineTask(FETCH_ALL_CONTENT_TASK, async () => {
  const result = await syncContent();
  return result.status === 'failed'
    ? BackgroundTask.BackgroundTaskResult.Failed
    : BackgroundTask.BackgroundTaskResult.Success;
});

export const setUpBackgroundFetch = async () => {
  await BackgroundTask.registerTaskAsync(FETCH_ALL_CONTENT_TASK, {
    minimumInterval: 15,
  });
};
