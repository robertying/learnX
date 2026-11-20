// Keeps what learnX shows outside the app in step with its data: the
// Deadlines and Up Next widgets, deadline and class reminders, Spotlight, the
// App Intents' data, the assignments written to the system calendar or
// Reminders, the classes synced to the calendar, and the courses shared with
// courseX. Each is worked out from the cached lists, the user data and the
// settings whenever those change, in whichever JS runtime that happens: the
// app, the background sync, or a notification action handled without the app.
import { AppState } from 'react-native';
import { queryClient } from 'data/queryClient';
import { assignmentsQuery, filesQuery, noticesQuery } from 'data/content';
import { getCachedWeekSessions } from 'data/schedule';
import { coursesQuery } from 'data/queries';
import { getSettings, useSettingsStore } from 'data/settings';
import { getUserData, useUserDataStore } from 'data/userData';
import { queryKeys } from 'data/queryKeys';
import {
  Assignment,
  contentListNames,
  Course,
  File,
  Notice,
} from 'data/types/state';
import type { ToastMessage } from 'services/calendar/actions';
import { assignmentEntriesMissing } from 'services/calendar/calendars';
import {
  updateSyncedClasses,
  syncedClassesMissing,
  syncedClassWeeks,
} from 'services/calendar/classes';
import { uploadCourses } from 'services/coursex';
import { recordError } from 'services/crashReporting';
import { perfCount, perfTime } from 'services/perfSurfaces';
import {
  cancelClassReminders,
  syncClassReminders,
} from 'services/classReminders';
import {
  cancelDeadlineReminders,
  syncDeadlineReminders,
} from 'services/deadlineReminders';
import { upcomingAssignments } from 'helpers/assignments';
import { startOfWeek } from 'helpers/schedule';
import { isShownBy } from 'helpers/shown';
import { beijingDate } from 'helpers/serverTime';
import { uses24HourClock } from 'helpers/i18n';
import {
  clearShortcuts,
  saveUpcomingClasses,
  saveUpcomingDeadlines,
} from 'services/shortcuts';
import { clearSpotlight, updateSpotlight } from 'services/spotlight';
import { UpcomingClass, upcomingClasses } from 'helpers/upNext';
import { updateDeadlineWidget, updateUpNextWidget } from 'widgets';

interface Inputs {
  /** The semester being shown's lists; undefined until fetched. */
  assignments: Assignment[] | undefined;
  notices: Notice[] | undefined;
  files: File[] | undefined;
  /** The semester being shown's courses; undefined until fetched. */
  courses: Course[] | undefined;
  hiddenCourses: string[];
  /** Archived assignments' ids. */
  archived: string[];
  settings: ReturnType<typeof getSettings>;
  /** This and next week's classes still ahead (JSON); empty until known. */
  classes: string;
  /** How many times the app came back to the foreground. */
  resumes: number;
  /** The saved timetable weeks the course calendar follows. */
  classWeeks: unknown[];
  /**
   * Whether the device shows 24-hour times, which the widgets write their
   * times in; read again each time the app comes back (`helpers/i18n`).
   */
  hour24: boolean;
}

let resumes = 0;

const readInputs = (): Inputs => {
  const { currentSemester, hiddenCourses, archived } = getUserData();
  const assignments = currentSemester
    ? queryClient.getQueryData(assignmentsQuery(currentSemester).queryKey)
    : undefined;
  const notices = currentSemester
    ? queryClient.getQueryData(noticesQuery(currentSemester).queryKey)
    : undefined;
  const files = currentSemester
    ? queryClient.getQueryData(filesQuery(currentSemester).queryKey)
    : undefined;
  const courses = currentSemester
    ? queryClient.getQueryData(coursesQuery(currentSemester).queryKey)
    : undefined;
  // Classes after the weekend are next week's.
  const thisWeek = startOfWeek(beijingDate(Date.now()));
  const thisWeekSchedule = getCachedWeekSessions(thisWeek);
  const nextWeekSchedule = getCachedWeekSessions(thisWeek.add(7, 'day'));

  return {
    assignments,
    notices,
    files,
    courses,
    hiddenCourses,
    archived: archived.assignment,
    settings: getSettings(),
    classes:
      thisWeekSchedule.source === 'none'
        ? ''
        : JSON.stringify(
            upcomingClasses([
              ...thisWeekSchedule.sessions,
              ...nextWeekSchedule.sessions,
            ]),
          ),
    resumes,
    classWeeks: syncedClassWeeks(),
    hour24: uses24HourClock(),
  };
};

/** Something a calendar or Reminders write turned up for the user to see. */
type ErrorListener = (message: ToastMessage) => void;
const errorListeners = new Set<ErrorListener>();

/**
 * Hears about failed calendar and Reminders writes, e.g. to show a toast
 * while the app is open. Returns the unsubscribe function.
 */
export const subscribeSurfaceErrors = (listener: ErrorListener) => {
  errorListeners.add(listener);
  return () => {
    errorListeners.delete(listener);
  };
};

/**
 * The assignments written to the calendar or Reminders: the ones the
 * Assignments tab shows (no archived ones, none in a hidden course) with the
 * deadline ahead. `removed` are the ones left out, whose entries go.
 */
const syncedAssignments = ({
  assignments,
  hiddenCourses,
  archived,
}: Inputs) => {
  if (!assignments) {
    return undefined;
  }
  const isShown = isShownBy(hiddenCourses, archived);
  return {
    written: upcomingAssignments(assignments.filter(isShown)),
    removed: assignments.filter(a => !isShown(a)).map(a => a.id),
  };
};

/**
 * Writes the synced assignments to the calendar or Reminders, and deletes
 * the entries of the ones left out.
 */
const syncCalendar = async (type: 'calendar' | 'reminder', inputs: Inputs) => {
  const synced = syncedAssignments(inputs);
  if (!synced) {
    return;
  }
  const { syncAssignments } =
    require('services/calendar/actions') as typeof import('services/calendar/actions');
  const message = await syncAssignments(type, synced.written, synced.removed, {
    automatic: true,
  });
  if (message) {
    errorListeners.forEach(listener => listener(message));
  }
};

/** Whether a synced assignment has lost its event or reminder. */
const calendarEntriesMissing = async (
  type: 'calendar' | 'reminder',
  inputs: Inputs,
) => {
  const synced = syncedAssignments(inputs);
  return !!synced && assignmentEntriesMissing(type, synced.written);
};

/**
 * One output: what it depends on (compared one by one, like an effect's
 * dependencies) and how to update it. It runs when a dependency changes.
 */
interface Surface {
  name: string;
  deps: (inputs: Inputs) => unknown[];
  update: (inputs: Inputs) => void | Promise<void>;
  /**
   * For an output the user can change outside learnX (the calendar and
   * Reminders): whether it lost what it was given, checked when nothing it
   * depends on changed. True runs `update` anyway.
   */
  missing?: (inputs: Inputs) => Promise<boolean>;
}

const surfaces: Surface[] = [
  {
    name: 'Deadlines widget',
    deps: i => [i.assignments, i.hiddenCourses, i.archived, i.hour24],
    // Until the assignments are loaded, the widget keeps what it had.
    update: ({ assignments, hiddenCourses, archived }) => {
      if (assignments) {
        updateDeadlineWidget(assignments, { hiddenCourses, archived });
      }
    },
  },
  {
    name: 'Deadline reminders',
    deps: i => [
      i.assignments,
      i.hiddenCourses,
      i.archived,
      i.settings.notifications.deadlineReminders,
      i.settings.notifications.deadlineReminderOffset,
      // Class reminders take part of the room.
      i.settings.notifications.classReminders,
      // The notification or exact alarm permission may have changed in the
      // system settings.
      i.resumes,
    ],
    update: ({ assignments, hiddenCourses, archived, settings }) =>
      assignments &&
      syncDeadlineReminders(assignments, {
        settings: settings.notifications,
        hiddenCourses,
        archived,
      }),
  },
  {
    name: 'Class reminders',
    deps: i => [
      i.classes,
      i.settings.notifications.classReminders,
      i.settings.notifications.classReminderOffset,
      i.resumes,
    ],
    // Until this week's classes are known, the scheduled ones stay.
    update: ({ classes, settings }) =>
      classes
        ? syncClassReminders(JSON.parse(classes) as UpcomingClass[], {
            settings: settings.notifications,
          })
        : undefined,
  },
  {
    name: 'Spotlight',
    deps: i => [i.notices, i.assignments, i.files, i.hiddenCourses],
    update: ({ notices, assignments, files, hiddenCourses }) =>
      updateSpotlight({ notices, assignments, files }, { hiddenCourses }),
  },
  {
    name: 'Next Deadline intent',
    deps: i => [i.assignments, i.hiddenCourses, i.archived],
    update: ({ assignments, hiddenCourses, archived }) => {
      if (assignments) {
        saveUpcomingDeadlines(assignments, { hiddenCourses, archived });
      }
    },
  },
  {
    name: 'Next Class intent',
    deps: i => [i.classes],
    // Until this week's classes are known, it keeps what it had.
    update: ({ classes }) => {
      if (classes) {
        saveUpcomingClasses(JSON.parse(classes) as UpcomingClass[]);
      }
    },
  },
  {
    name: 'Up Next widget',
    deps: i => [i.classes, i.hour24],
    // Until this week's classes are known, it keeps what it had.
    update: ({ classes }) => {
      if (classes) {
        updateUpNextWidget(JSON.parse(classes) as UpcomingClass[]);
      }
    },
  },
  {
    name: 'Calendar assignments',
    // The lists and settings themselves, which keep their identity until
    // they change, so the calendar is written only when something did.
    deps: i => [
      i.assignments,
      i.hiddenCourses,
      i.archived,
      i.settings.assignmentCalendarSync,
      i.settings.alarms,
      i.settings.calendarEventLength,
    ],
    update: inputs =>
      inputs.settings.assignmentCalendarSync
        ? syncCalendar('calendar', inputs)
        : undefined,
    missing: async inputs =>
      inputs.settings.assignmentCalendarSync &&
      calendarEntriesMissing('calendar', inputs),
  },
  {
    name: 'Reminders assignments',
    deps: i => [
      i.assignments,
      i.hiddenCourses,
      i.archived,
      i.settings.assignmentReminderSync,
      i.settings.alarms,
    ],
    update: inputs =>
      inputs.settings.assignmentReminderSync
        ? syncCalendar('reminder', inputs)
        : undefined,
    missing: async inputs =>
      inputs.settings.assignmentReminderSync &&
      calendarEntriesMissing('reminder', inputs),
  },
  {
    name: 'Calendar classes',
    // The followed weeks' timetables and the class settings; each week is
    // written again only when what it's written from changed.
    deps: i => [
      ...i.classWeeks,
      i.settings.courseCalendarSync,
      i.settings.graduate,
      i.settings.alarms,
      i.settings.courseEventOmitLocation,
    ],
    update: () => updateSyncedClasses(),
    missing: () => syncedClassesMissing(),
  },
  {
    name: 'courseX sharing',
    deps: i => [i.courses, i.settings.courseInformationSharing],
    // Once per JS runtime and whenever the courses change, while sharing is
    // on; uploadCourses skips the mock account.
    update: ({ courses, settings }) =>
      settings.courseInformationSharing && courses?.length
        ? uploadCourses(courses)
        : undefined,
  },
];

/** Each surface's dependencies when it last ran. */
let lastDeps = new Map<string, unknown[]>();

const changed = (before: unknown[] | undefined, after: unknown[]) =>
  !before ||
  before.length !== after.length ||
  before.some((value, i) => !Object.is(value, after[i]));

/** Whether the surface lost what it was given; false when that can't be told. */
const isMissing = async (surface: Surface, inputs: Inputs) => {
  try {
    return (await surface.missing?.(inputs)) ?? false;
  } catch (error) {
    recordError(error, `Checking ${surface.name}`);
    return false;
  }
};

/**
 * How often the outputs the user can change outside learnX are checked when
 * nothing they depend on changed: each check lists a calendar, and refreshes
 * come with every change to the lists (an item marked read).
 */
export const MISSING_CHECK_MS = 60 * 1000;

/** When the missing checks last ran (ms), and at which foreground count. */
let missingChecked: { at: number; resumes: number } | null = null;

/**
 * Whether this refresh checks for lost entries: the first in a JS runtime,
 * the first after coming back to the app (the user may have been in Calendar
 * or Reminders), and otherwise once a minute at most.
 */
const shouldCheckMissing = ({ resumes: count }: Inputs) =>
  !missingChecked ||
  missingChecked.resumes !== count ||
  Date.now() - missingChecked.at >= MISSING_CHECK_MS;

let running: Promise<void> = Promise.resolve();

/**
 * Updates the surfaces whose data changed since they were last updated.
 * Runs one at a time; resolves when this run is done (the background task
 * and notification actions wait for it before the system ends them). Never
 * rejects.
 */
export const refreshSurfaces = () => {
  running = running.then(async () => {
    perfCount('refreshes');
    const perfAll = performance.now();
    const inputs = readInputs();
    perfTime('readInputs', performance.now() - perfAll);
    const checkMissing = shouldCheckMissing(inputs);
    if (checkMissing) {
      missingChecked = { at: Date.now(), resumes: inputs.resumes };
    }
    for (const surface of surfaces) {
      const deps = surface.deps(inputs);
      if (
        !changed(lastDeps.get(surface.name), deps) &&
        !(checkMissing && (await isMissing(surface, inputs)))
      ) {
        continue;
      }
      lastDeps.set(surface.name, deps);
      const perfStart = performance.now();
      try {
        await surface.update(inputs);
        perfTime(surface.name, performance.now() - perfStart);
        perfCount(`ran ${surface.name}`);
      } catch (error) {
        // Tried again with the next change.
        lastDeps.delete(surface.name);
        recordError(error, `Updating ${surface.name}`);
      }
    }
    perfTime('refreshTotal', performance.now() - perfAll);
  });
  return running;
};

/** Runs one output's clearing, reporting a failure instead of stopping the rest. */
const clearing = (name: string, clear: () => void) => {
  try {
    clear();
  } catch (error) {
    recordError(error, `Clearing ${name}`);
  }
};

/**
 * Empties the widgets, Spotlight, the App Intents and the reminders, e.g. on
 * logout. Calendar and Reminders entries stay (Settings › Calendar deletes
 * them). Resolves once the reminders are cancelled; never rejects.
 */
export const clearSurfaces = () => {
  // In the same queue as the refreshes, so a refresh for the next account
  // never schedules reminders that this then cancels.
  running = running.then(async () => {
    lastDeps = new Map();
    missingChecked = null;
    clearing('Deadlines widget', () =>
      updateDeadlineWidget([], { hiddenCourses: [], archived: [] }),
    );
    clearing('Up Next widget', () => updateUpNextWidget());
    clearing('Spotlight', clearSpotlight);
    clearing('App Intents', clearShortcuts);
    await Promise.all([
      cancelDeadlineReminders().catch(() => {}),
      cancelClassReminders().catch(() => {}),
    ]);
  });
  return running;
};

/** Lists whose changes the surfaces follow, by the first part of their key. */
const watchedQueries = new Set<string>([
  ...contentListNames,
  queryKeys.coursesAll[0],
  queryKeys.schoolSemester[0],
  queryKeys.calendarAll[0],
]);

/**
 * How long a settings change waits for the next before the surfaces follow:
 * a number typed in Settings changes the setting with each digit.
 */
export const SETTINGS_SETTLE_MS = 1000;

let timer: ReturnType<typeof setTimeout> | undefined;
/** When the scheduled refresh runs (ms). */
let due = 0;

/**
 * Refreshes once after the changes made in this tick, or `delay` ms after
 * the last of a run of changes. A refresh that's due later isn't moved
 * earlier, so a change elsewhere doesn't catch a setting halfway typed.
 */
const schedule = (delay = 0) => {
  const at = Date.now() + delay;
  if (timer !== undefined && due >= at) {
    return;
  }
  clearTimeout(timer);
  due = at;
  timer = setTimeout(() => {
    timer = undefined;
    void refreshSurfaces();
  }, delay);
};

let watching = false;

/**
 * Starts following the data, from `index.js`, so every JS runtime keeps the
 * surfaces current: the app, the background task, and Android's notification
 * action task. Coming back to the app refreshes too, so Up Next moves on to a
 * new week. Safe to call more than once.
 */
export const watchSurfaces = () => {
  if (watching) {
    return;
  }
  watching = true;
  queryClient.getQueryCache().subscribe(event => {
    if (
      event.type === 'updated' &&
      event.action.type === 'success' &&
      watchedQueries.has(String(event.query.queryKey[0]))
    ) {
      schedule();
    }
  });
  // Only what the surfaces read: the waiting server actions change with every
  // favorite and opened notice.
  useUserDataStore.subscribe((data, before) => {
    if (
      data.currentSemester !== before.currentSemester ||
      data.hiddenCourses !== before.hiddenCourses ||
      data.archived !== before.archived
    ) {
      schedule();
    }
  });
  useSettingsStore.subscribe(() => schedule(SETTINGS_SETTLE_MS));
  AppState.addEventListener('change', state => {
    if (state === 'active') {
      resumes += 1;
      schedule();
    }
  });
  schedule();
};
