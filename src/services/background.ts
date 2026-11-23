import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { AppState } from 'react-native';
import { ensureSession } from 'data/source';
import { hasSavedLogin, loadCredentials } from 'data/credentials';
import { coursesQuery, schoolSemesterQuery } from 'data/queries';
import { queryClient, restoreQueryCache } from 'data/queryClient';
import { applyLatestSemester, getUserData } from 'data/userData';
import { contentLists } from 'data/content';
import { queryKeys } from 'data/queryKeys';
import { SyncRun, addSyncRun, describeSyncRun } from 'data/syncLog';
import type { Assignment, ContentListName } from 'data/types/state';
import { ContentDiff, ContentLists, diffContent } from 'data/contentDiff';
import { flushServerActionsWithin } from 'data/serverActions';
import { getSettings } from 'data/settings';
import { addNotifiedKeys, getNotifiedKeys } from 'data/notified';
import {
  type ContentKind,
  groupContentItems,
  pickContentItems,
} from 'helpers/contentNotifications';
import { recordError, setCustomKey } from 'services/crashReporting';
import { checkForUpdate } from 'services/updateNotifications';
import {
  getNotificationPermission,
  postNotification,
} from 'services/notifications';
import { refreshSurfaces } from 'services/surfaces';
import { calendarWeekQuery } from 'data/schedule';
import { startOfWeek } from 'helpers/schedule';
import { waitAtMost } from 'helpers/waitAtMost';
import { beijingDate } from 'helpers/serverTime';
import DeviceInfo from 'constants/DeviceInfo';
import { t } from 'helpers/i18n';
import { MenuBar } from 'modules/menubar';

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
    const { id: latest } = await queryClient.fetchQuery(schoolSemesterQuery);
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
 * background app refresh task, which has about 30 s from launch before the
 * system ends it, and gives fewer runs to an app that overruns; the rest of
 * that time goes to starting the app and to saving, the widgets and the
 * notifications after the fetch. Android stops it after 10 minutes. What's
 * fetched by then is saved and notified about, and the rest waits for the
 * next run.
 */
export const SYNC_BUDGET_MS = 20_000;

/**
 * How long the sync waits for the widgets, reminders and Spotlight to follow
 * what it saved (`refreshSurfaces`). The system can take minutes to answer,
 * as Spotlight does after a restart; what isn't done by then carries on while
 * the app runs, or at the next refresh.
 */
const SURFACES_WAIT_MS = 5_000;

/**
 * The least time left for a timetable week to be asked for; the registrar
 * answers in about a second, and a week cut short is only asked again next
 * run.
 */
const TIMETABLE_MIN_MS = 3_000;

/**
 * Fetches this week's and next week's timetable when the saved copy is older
 * than its stale time (half a day), one request a week, in what's left of
 * the budget. The class reminders and the Up Next widget follow it
 * (services/surfaces), so they keep up with a moved class while the app stays
 * closed. A week that fails keeps its saved copy.
 */
const refreshTimetable = async (deadline: number) => {
  const thisWeek = startOfWeek(beijingDate(Date.now()));
  const { graduate } = getSettings();
  for (const week of [thisWeek, thisWeek.add(7, 'day')]) {
    const left = deadline - Date.now();
    if (left < TIMETABLE_MIN_MS) {
      return;
    }
    try {
      await waitAtMost(
        queryClient.fetchQuery(
          calendarWeekQuery(week.format('YYYY-MM-DD'), graduate),
        ),
        left,
      );
    } catch {
      // Kept as it was; Today shows the saved week and tries again.
    }
  }
};

/** The lists the sync fetches. */
const SYNC_LISTS: readonly ContentListName[] = [
  'assignments',
  'notices',
  'files',
];

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

  if (!shownSemester || !hasSavedLogin(credentials) || !courses?.length) {
    return record({ status: 'skipped' });
  }

  // Keeps the session if it's still good (the app may be running) and logs
  // in only when it has expired, rather than a full SSO login every run. A
  // login is a few requests, each allowed a minute, so it counts against the
  // budget like the fetches.
  const session = await waitAtMost(
    ensureSession().then(
      () => 'open' as const,
      () => 'failed' as const,
    ),
    deadline - Date.now(),
  );
  if (session !== 'open') {
    return record({ status: 'skipped' }, session ? {} : { timedOut: true });
  }

  // Favorites and notices read while offline (or from a notification) go up
  // first, so the lists fetched below already have them.
  await flushServerActionsWithin(Math.min(5_000, deadline - Date.now()), {
    requireLogin: false,
  });

  const semesterId =
    (await waitAtMost(
      followLatestSemester(shownSemester),
      deadline - Date.now(),
    )) ?? shownSemester;
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

  const before: ContentLists = Object.fromEntries(
    SYNC_LISTS.map(list => [
      list,
      queryClient.getQueryData(queryKeys.content(list, semesterId)),
    ]),
  );

  // The three lists share the screens' limiter, which starts assignments
  // first, so deadlines are in if time runs out.
  const fetchStartedAt = Date.now();
  const runs = await Promise.all(
    SYNC_LISTS.map(list =>
      contentLists[list].fetchCourses(semesterId, courseIds, { deadline }),
    ),
  );
  const counts = Object.fromEntries(
    SYNC_LISTS.map((list, i) => [
      list,
      { fetched: runs[i].fetched.size, total: courseIds.length },
    ]),
  ) as NonNullable<SyncRun['courses']>;
  // Saves the courses of each list that came back into it.
  const after: ContentLists = Object.fromEntries(
    await Promise.all(
      SYNC_LISTS.map(async (list, i) => {
        const { fetched } = runs[i];
        const items =
          fetched.size > 0
            ? await contentLists[list].putCourses(semesterId, fetched, {
                complete: fetched.size === courseIds.length,
                startedAt: fetchStartedAt,
              })
            : undefined;
        return [list, items];
      }),
    ),
  );
  const details = {
    courses: counts,
    timedOut: runs.some(run => run.timedOut),
  };

  if (!after.notices && !after.assignments && !after.files) {
    return record({ status: 'failed' }, details);
  }
  // After the lists, which matter more if time runs short.
  await refreshTimetable(deadline);
  // The lists saved above update the widgets, reminders and Spotlight
  // (services/surfaces); wait for that before the system ends the task.
  await waitAtMost(refreshSurfaces(), SURFACES_WAIT_MS);
  return record(
    { status: 'synced', diff: diffContent(before, after) },
    details,
  );
};

/**
 * What's still posted while the app is open: changes to an assignment the
 * user already has, which are easy to miss in a list. New notices, files and
 * assignments stay quiet there, as their unread markers show them.
 */
const OPEN_APP_KINDS: ReadonlySet<ContentKind> = new Set([
  'grades',
  'comments',
  'deadlineChanges',
]);

/**
 * Tells the user what a sync found, as they chose in Settings › Notifications.
 * While the app is open, only `OPEN_APP_KINDS` are posted; everything found is
 * remembered so it isn't posted later. `inForeground` posts all of it anyway,
 * for trying it out in a debug build.
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
  // Remembered before posting, so a sync that finds the same change while
  // this one waits on the permission doesn't post it again.
  addNotifiedKeys(items.map(item => item.key));

  const appOpen = !inForeground && AppState.currentState === 'active';
  const shown = appOpen
    ? items.filter(item => OPEN_APP_KINDS.has(item.kind))
    : items;
  if (shown.length === 0) {
    return [];
  }
  const notifications = groupContentItems(shown);
  if ((await getNotificationPermission()) === 'granted') {
    for (const notification of notifications) {
      try {
        await postNotification(notification);
      } catch (error) {
        // The rest still go out.
        recordError(error, 'Posting a content notification');
      }
    }
  }
  return notifications;
};

/** Each semester's assignments as last seen, by query hash. */
const seenAssignments = new Map<string, readonly Assignment[]>();
let watchingAssignments = false;

/**
 * Notifies about assignments the app itself finds graded, commented on or
 * moved while it's open: a pull to refresh, coming back to the app, a
 * course's page. The background task compares what it fetches on its own;
 * this covers every other fetch, which would otherwise update the list
 * without a word. The first list seen for a semester (restored or fetched)
 * is only remembered, and nothing is posted while the app isn't open, where
 * the background task does it. Safe to call more than once.
 */
export const watchAssignmentChanges = () => {
  if (watchingAssignments) {
    return;
  }
  watchingAssignments = true;
  queryClient.getQueryCache().subscribe(event => {
    const { query } = event;
    if (query.queryKey[0] !== queryKeys.contentAll('assignments')[0]) {
      return;
    }
    if (event.type === 'removed') {
      seenAssignments.delete(query.queryHash);
      return;
    }
    if (event.type !== 'updated' || event.action.type !== 'success') {
      return;
    }
    // A successful update always has data.
    const after = query.state.data as readonly Assignment[];
    const before = seenAssignments.get(query.queryHash);
    seenAssignments.set(query.queryHash, after);
    if (!before || before === after || AppState.currentState !== 'active') {
      return;
    }
    notifyContent(
      diffContent({ assignments: before }, { assignments: after }),
    ).catch(error => recordError(error, 'Posting assignment changes'));
  });
};

const FETCH_ALL_CONTENT_TASK = 'FETCH_ALL_CONTENT_TASK';

/** How often the sync runs, at the soonest. */
const SYNC_INTERVAL_MINUTES = 15;

/**
 * How long a sync on the Mac's own timer may take. Nothing ends it there, and
 * App Nap slows a learnX that isn't in front, so it gets longer than a system
 * task.
 */
export const MAC_SYNC_BUDGET_MS = 60_000;

/** The sync under way, which a run that comes meanwhile waits for. */
let currentSync: Promise<SyncResult['status']> | null = null;

/**
 * Syncs, notifies about what's new and checks for a new version, unless a
 * run is already under way, whose result it then returns.
 */
const runSync = (budget?: number) => {
  currentSync ??= (async () => {
    // A new version of the APKs, at most every few hours; next to the sync,
    // so a slow mirror doesn't eat its time.
    const updateChecked = checkForUpdate();
    const result = await syncContent({ budget });
    if (result.status === 'synced') {
      try {
        await notifyContent(result.diff);
      } catch (error) {
        recordError(error, 'Posting new content notifications');
      }
    }
    await updateChecked;
    return result.status;
  })().finally(() => {
    currentSync = null;
  });
  return currentSync;
};

// Runs when index.js imports this module, so the task exists on a background
// launch too.

TaskManager.defineTask(FETCH_ALL_CONTENT_TASK, async () =>
  (await runSync()) === 'failed'
    ? BackgroundTask.BackgroundTaskResult.Failed
    : BackgroundTask.BackgroundTaskResult.Success,
);

let macTimer: ReturnType<typeof setInterval> | null = null;

/**
 * The Mac: shows learnX in the menu bar and syncs every 15 minutes while it
 * runs, in front or not, with its windows open or closed. macOS never
 * launches an app for its background tasks and doesn't run them reliably
 * while it's open, so the Mac keeps its own timer, and its menu bar item
 * keeps it running without a window (opened at login, or after the last
 * window closed). App Nap may put a run off while learnX isn't in front: the
 * sync is discretionary work, which macOS is free to delay. index.js calls
 * it, since JS starts without a window at login; safe to call again.
 */
export const runInMenuBar = () => {
  if (!DeviceInfo.isMac() || macTimer) {
    return;
  }
  macTimer = setInterval(() => {
    void runSync(MAC_SYNC_BUDGET_MS);
  }, SYNC_INTERVAL_MINUTES * 60_000);
  MenuBar?.addListener('onCheckForNewContent', () => {
    void runSync(MAC_SYNC_BUDGET_MS);
  });
  MenuBar?.showItem({
    open: t('trayOpen'),
    checkForNewContent: t('trayCheckForNewItems'),
    quit: t('trayQuit'),
  }).catch(error => recordError(error, 'Showing the menu bar item'));
};

/**
 * Has the system run the sync about every 15 minutes, where it runs tasks for
 * apps (iOS and Android; the Electron app's stand-in, web/packages). The
 * Mac syncs on its own timer instead (`runInMenuBar`).
 */
export const setUpBackgroundFetch = async () => {
  if (DeviceInfo.isMac()) {
    return;
  }
  await BackgroundTask.registerTaskAsync(FETCH_ALL_CONTENT_TASK, {
    minimumInterval: SYNC_INTERVAL_MINUTES,
  });
};
