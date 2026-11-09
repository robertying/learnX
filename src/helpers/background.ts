import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { AppState } from 'react-native';
import { ensureSession } from 'data/source';
import { loadCredentials } from 'data/credentials';
import { coursesQuery, latestSemesterQuery } from 'data/queries';
import { queryClient, restoreQueryCache } from 'data/queryClient';
import { applyLatestSemester, getUserData } from 'data/userData';
import {
  assignmentsQuery,
  contentLists,
  filesQuery,
  noticesQuery,
} from 'data/content';
import {
  SyncListName,
  SyncRun,
  addSyncRun,
  describeSyncRun,
} from 'data/syncLog';
import { ContentDiff, ContentLists, diffContent } from 'data/contentDiff';
import { flushServerActionsWithin } from 'data/serverActions';
import { getSettings } from 'data/settings';
import { addNotifiedKeys, getNotifiedKeys } from 'data/notified';
import {
  groupContentItems,
  pickContentItems,
} from 'helpers/contentNotifications';
import { recordError, setCustomKey } from 'helpers/crashReporting';
import { runUntil } from 'helpers/runUntil';
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
 * How long a sync may spend logging in and fetching. iOS runs the task as a
 * background processing task, which it can end at any moment (when the user
 * picks the phone up), and Android stops it after 10 minutes; what's fetched
 * by then is saved and notified about, and the rest waits for the next run.
 */
export const SYNC_BUDGET_MS = 25_000;

/**
 * Courses fetched at once. A course's assignments take a few requests plus
 * two per assignment, so a few courses already keep the connections busy.
 */
const COURSE_CONCURRENCY = 3;

/** Fetched in this order, deadlines first, so they're in if time runs out. */
const SYNC_LISTS: readonly SyncListName[] = ['assignments', 'notices', 'files'];

/**
 * Logs in and refetches the current semester's notices, assignments and files
 * course by course, skipping hidden courses, within `SYNC_BUDGET_MS`. The
 * fetched courses replace theirs in the lists the screens use, so the app
 * shows them at its next launch and the persisted cache is up to date.
 * Returns what changed in the courses it fetched, and records the run.
 */
export const syncContent = async ({
  manual = false,
  budget = SYNC_BUDGET_MS,
}: { manual?: boolean; budget?: number } = {}): Promise<SyncResult> => {
  const startedAt = Date.now();
  const deadline = startedAt + budget;
  const record = (
    result: SyncResult,
    details: Pick<SyncRun, 'courses' | 'timedOut'> = {},
  ) => {
    const run: SyncRun = {
      startedAt,
      duration: Date.now() - startedAt,
      status: result.status,
      ...details,
      ...(manual && { manual }),
    };
    addSyncRun(run);
    setCustomKey('last_sync', describeSyncRun(run));
    if (run.timedOut && !manual) {
      recordError(
        new Error('Background sync ran out of time'),
        describeSyncRun(run),
      );
    }
    return result;
  };

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
    return record({ status: 'skipped' });
  }

  try {
    // Keeps the session if it's still good (the app may be running) and logs
    // in only when it has expired, rather than a full SSO login every run.
    await ensureSession();
  } catch {
    return record({ status: 'skipped' });
  }

  // Favorites and notices read while offline (or from a notification) go up
  // first, so the lists fetched below already have them.
  await flushServerActionsWithin(Math.min(5_000, deadline - Date.now()), {
    requireLogin: false,
  });

  const semesterId = await followLatestSemester(shownSemester);
  // Nothing is shown or notified for hidden courses, so they aren't fetched.
  const hidden = new Set(getUserData().hiddenCourses);
  const courseIds = (
    queryClient.getQueryData(coursesQuery(semesterId).queryKey) ?? []
  )
    .map(course => course.id)
    .filter(id => !hidden.has(id));
  if (courseIds.length === 0) {
    return record({ status: 'skipped' });
  }

  const queries = {
    notices: noticesQuery(semesterId),
    assignments: assignmentsQuery(semesterId),
    files: filesQuery(semesterId),
  };
  const before: ContentLists = {
    notices: queryClient.getQueryData(queries.notices.queryKey),
    assignments: queryClient.getQueryData(queries.assignments.queryKey),
    files: queryClient.getQueryData(queries.files.queryKey),
  };

  const fetchStartedAt = Date.now();
  const jobs = SYNC_LISTS.flatMap(list =>
    courseIds.map(courseId => ({ list, courseId })),
  );
  const results = await runUntil(
    jobs.map(
      ({ list, courseId }) =>
        () =>
          contentLists[list].fetchCourse(semesterId, courseId),
    ),
    { concurrency: COURSE_CONCURRENCY, deadline },
  );

  const counts = {} as NonNullable<SyncRun['courses']>;
  /** Saves the courses of `list` that came back; undefined if none did. */
  const put = async <T>(
    list: SyncListName,
    putCourses: (
      semesterId: string,
      fetched: ReadonlyMap<string, object[]>,
      options: { complete: boolean; startedAt: number },
    ) => Promise<T[]>,
  ) => {
    const fetched = new Map<string, object[]>();
    jobs.forEach((job, index) => {
      const result = results[index];
      if (job.list === list && result?.status === 'fulfilled') {
        fetched.set(job.courseId, result.value);
      }
    });
    counts[list] = { fetched: fetched.size, total: courseIds.length };
    return fetched.size > 0
      ? putCourses(semesterId, fetched, {
          complete: fetched.size === courseIds.length,
          startedAt: fetchStartedAt,
        })
      : undefined;
  };
  const after = {
    assignments: await put('assignments', contentLists.assignments.putCourses),
    notices: await put('notices', contentLists.notices.putCourses),
    files: await put('files', contentLists.files.putCourses),
  };
  const details = {
    courses: counts,
    timedOut: results.some(result => result === undefined),
  };

  if (!after.notices && !after.assignments && !after.files) {
    return record({ status: 'failed' }, details);
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
  return record(
    { status: 'synced', diff: diffContent(before, after) },
    details,
  );
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

// Runs when index.js imports this module, so the task exists on a background
// launch too.

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
