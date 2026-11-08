import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { AppState } from 'react-native';
import { loginWithFingerPrint } from 'data/source';
import { loadCredentials } from 'data/credentials';
import { coursesQuery, latestSemesterQuery } from 'data/queries';
import { queryClient, restoreQueryCache } from 'data/queryClient';
import { applyLatestSemester, getUserData } from 'data/userData';
import { assignmentsQuery, filesQuery, noticesQuery } from 'data/content';
import { ContentDiff, diffContent } from 'data/contentDiff';
import { getSettings } from 'data/settings';
import { addNotifiedKeys, getNotifiedKeys } from 'data/notified';
import {
  groupContentItems,
  pickContentItems,
} from 'helpers/contentNotifications';
import { recordError } from 'helpers/crashReporting';
import {
  getNotificationPermission,
  postNotification,
} from 'helpers/notifications';
import { updateDeadlineWidget } from 'widgets';
import { syncDeadlineReminders } from 'helpers/deadlineReminders';
import { updateSpotlight } from 'helpers/spotlight';

export type SyncResult =
  /** Not logged in, no courses cached yet, or the login failed. */
  | { status: 'skipped' }
  /** Every list failed to fetch. */
  | { status: 'failed' }
  /** At least one list was fetched; `diff` is what changed in those. */
  | { status: 'synced'; diff: ContentDiff };

/**
 * Moves to the school's new semester when a term starts, as the app does at
 * launch, and fetches its courses. Stays on the shown semester if the check
 * or the courses fail.
 */
const followLatestSemester = async (shownSemester: string) => {
  try {
    const latest = await queryClient.fetchQuery(latestSemesterQuery);
    const semesterId = applyLatestSemester(latest);
    if (semesterId !== shownSemester) {
      await queryClient.ensureQueryData(coursesQuery(semesterId));
    }
    return semesterId;
  } catch {
    return getUserData().currentSemester ?? shownSemester;
  }
};

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
  const shownSemester = getUserData().currentSemester;
  const courses =
    shownSemester &&
    queryClient.getQueryData(coursesQuery(shownSemester).queryKey);

  if (
    !shownSemester ||
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

  const semesterId = await followLatestSemester(shownSemester);

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
  const { hiddenCourses, archived } = getUserData();
  await updateSpotlight(after, {
    hiddenCourses,
    archived: archived.assignment,
  });
  if (after.assignments) {
    updateDeadlineWidget(after.assignments, {
      hiddenCourses,
      archived: archived.assignment,
    });
    try {
      await syncDeadlineReminders(after.assignments, {
        settings: getSettings().notifications,
        hiddenCourses,
        archived: archived.assignment,
      });
    } catch (error) {
      recordError(error, 'Scheduling deadline reminders');
    }
  }
  return { status: 'synced', diff: diffContent(before, after) };
};

/**
 * Tells the user what a sync found, as they chose in Settings › Notifications.
 * Nothing is posted while the app is open, where the lists show it; what was
 * found is still remembered so it isn't posted later. `inForeground` posts
 * anyway, for trying it out in a debug build.
 */
export const notifyContent = async (
  diff: ContentDiff,
  { inForeground = false }: { inForeground?: boolean } = {},
) => {
  const settings = getSettings().notifications;
  const { hiddenCourses, archived } = getUserData();
  const items = pickContentItems(diff, {
    settings,
    notified: getNotifiedKeys(),
    hiddenCourses,
    archived,
  });
  if (items.length === 0) {
    return [];
  }

  const notifications = groupContentItems(items);
  if (
    (inForeground || AppState.currentState !== 'active') &&
    (await getNotificationPermission()) === 'granted'
  ) {
    for (const notification of notifications) {
      try {
        await postNotification(notification);
      } catch {}
    }
  }
  addNotifiedKeys(items.map(item => item.key));
  return notifications;
};

const FETCH_ALL_CONTENT_TASK = 'FETCH_ALL_CONTENT_TASK';

TaskManager.defineTask(FETCH_ALL_CONTENT_TASK, async () => {
  const result = await syncContent();
  if (result.status === 'synced') {
    try {
      await notifyContent(result.diff);
    } catch (error) {
      recordError(error, 'Posting new content notifications');
    }
  }
  return result.status === 'failed'
    ? BackgroundTask.BackgroundTaskResult.Failed
    : BackgroundTask.BackgroundTaskResult.Success;
});

export const setUpBackgroundFetch = async () => {
  await BackgroundTask.registerTaskAsync(FETCH_ALL_CONTENT_TASK, {
    minimumInterval: 15,
  });
};
