// Keeps what learnX shows outside the app in step with its data: the
// Deadlines and Up Next widgets, deadline reminders, Spotlight, the App
// Intents' data, and the assignments written to the system calendar or
// Reminders. Each is worked out from the cached lists, the user data and the
// settings whenever those change, in whichever JS runtime that happens: the
// app, the background sync, or a notification action handled without the app.
import { AppState } from 'react-native';
import dayjs from 'dayjs';
import { queryClient } from 'data/queryClient';
import { assignmentsQuery, noticesQuery } from 'data/content';
import { getCachedWeekSessions } from 'data/schedule';
import { getSettings, useSettingsStore } from 'data/settings';
import { getUserData, useUserDataStore } from 'data/userData';
import { Assignment, Notice } from 'data/types/state';
import type { ToastMessage } from 'helpers/calendarSync';
import { recordError } from 'helpers/crashReporting';
import {
  cancelDeadlineReminders,
  syncDeadlineReminders,
} from 'helpers/deadlineReminders';
import { startOfWeek } from 'helpers/schedule';
import { beijingDate } from 'helpers/serverTime';
import {
  clearShortcuts,
  saveUpcomingClasses,
  saveUpcomingDeadlines,
} from 'helpers/shortcuts';
import { clearSpotlight, updateSpotlight } from 'helpers/spotlight';
import { UpcomingClass, upcomingClasses } from 'helpers/upNext';
import { updateDeadlineWidget, updateUpNextWidget } from 'widgets';

interface Inputs {
  /** The semester being shown's lists; undefined until fetched. */
  assignments: Assignment[] | undefined;
  notices: Notice[] | undefined;
  hiddenCourses: string[];
  /** Archived assignments' ids. */
  archived: string[];
  /** Archived and hidden assignments left out, as the Assignments tab shows. */
  shownAssignments: Assignment[] | undefined;
  /** Ids of the archived and hidden ones, whose calendar entries go. */
  leftOutAssignments: string[];
  settings: ReturnType<typeof getSettings>;
  /** This and next week's classes still ahead (JSON); empty until known. */
  classes: string;
  /** How many times the app came back to the foreground. */
  resumes: number;
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
  const archivedIds = new Set(archived.assignment);
  const hidden = new Set(hiddenCourses);

  // Classes after the weekend are next week's.
  const thisWeek = startOfWeek(beijingDate(Date.now()));
  const thisWeekSchedule = getCachedWeekSessions(thisWeek);
  const nextWeekSchedule = getCachedWeekSessions(thisWeek.add(7, 'day'));

  return {
    assignments,
    notices,
    hiddenCourses,
    archived: archived.assignment,
    shownAssignments: assignments?.filter(
      a => !archivedIds.has(a.id) && !hidden.has(a.courseId),
    ),
    leftOutAssignments: (assignments ?? [])
      .filter(a => archivedIds.has(a.id) || hidden.has(a.courseId))
      .map(a => a.id),
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

const syncCalendar = async (
  type: 'calendar' | 'reminder',
  assignments: Assignment[],
  leftOut: string[],
) => {
  // Loaded when needed: it brings in the file helpers, which only the app
  // needs (and Jest can't load).
  const { syncAssignments, upcomingAssignments } =
    require('helpers/calendarSync') as typeof import('helpers/calendarSync');
  const message = await syncAssignments(
    type,
    upcomingAssignments(assignments, dayjs()),
    leftOut,
  );
  if (message) {
    errorListeners.forEach(listener => listener(message));
  }
};

/**
 * One output: what it depends on (compared one by one, like an effect's
 * dependencies) and how to update it. It runs when a dependency changes.
 */
interface Surface {
  name: string;
  deps: (inputs: Inputs) => unknown[];
  update: (inputs: Inputs) => void | Promise<void>;
}

const surfaces: Surface[] = [
  {
    name: 'Deadlines widget',
    deps: i => [i.assignments, i.hiddenCourses, i.archived],
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
    name: 'Spotlight',
    deps: i => [i.notices, i.assignments, i.hiddenCourses],
    update: ({ notices, assignments, hiddenCourses }) =>
      updateSpotlight({ notices, assignments }, { hiddenCourses }),
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
    name: 'Up Next',
    deps: i => [i.classes, i.assignments, i.hiddenCourses, i.archived],
    // Until this week's classes are known, both keep what they had.
    update: ({ classes: json, assignments, hiddenCourses, archived }) => {
      if (!json) {
        return;
      }
      const classes = JSON.parse(json) as UpcomingClass[];
      saveUpcomingClasses(classes);
      if (assignments) {
        updateUpNextWidget(classes, assignments, { hiddenCourses, archived });
      }
    },
  },
  {
    name: 'Calendar assignments',
    deps: i => [
      i.shownAssignments,
      i.settings.assignmentCalendarSync,
      i.settings.alarms,
      i.settings.calendarEventLength,
    ],
    update: ({ shownAssignments, leftOutAssignments, settings }) =>
      settings.assignmentCalendarSync && shownAssignments
        ? syncCalendar('calendar', shownAssignments, leftOutAssignments)
        : undefined,
  },
  {
    name: 'Reminders assignments',
    deps: i => [
      i.shownAssignments,
      i.settings.assignmentReminderSync,
      i.settings.alarms,
    ],
    update: ({ shownAssignments, leftOutAssignments, settings }) =>
      settings.assignmentReminderSync && shownAssignments
        ? syncCalendar('reminder', shownAssignments, leftOutAssignments)
        : undefined,
  },
];

/** Each surface's dependencies when it last ran. */
let lastDeps = new Map<string, unknown[]>();

const changed = (before: unknown[] | undefined, after: unknown[]) =>
  !before ||
  before.length !== after.length ||
  before.some((value, i) => !Object.is(value, after[i]));

let running: Promise<void> = Promise.resolve();

/**
 * Updates the surfaces whose data changed since they were last updated.
 * Runs one at a time; resolves when this run is done (the background task
 * and notification actions wait for it before the system ends them). Never
 * rejects.
 */
export const refreshSurfaces = () => {
  running = running.then(async () => {
    const inputs = readInputs();
    for (const surface of surfaces) {
      const deps = surface.deps(inputs);
      if (!changed(lastDeps.get(surface.name), deps)) {
        continue;
      }
      lastDeps.set(surface.name, deps);
      try {
        await surface.update(inputs);
      } catch (error) {
        // Tried again with the next change.
        lastDeps.delete(surface.name);
        recordError(error, `Updating ${surface.name}`);
      }
    }
  });
  return running;
};

/**
 * Empties the widgets, Spotlight, the App Intents and the reminders, e.g. on
 * logout. Calendar and Reminders entries stay (Settings › Calendar deletes
 * them). Resolves once the reminders are cancelled; never rejects.
 */
export const clearSurfaces = () => {
  lastDeps = new Map();
  updateDeadlineWidget([], { hiddenCourses: [], archived: [] });
  updateUpNextWidget();
  clearSpotlight();
  clearShortcuts();
  return cancelDeadlineReminders().catch(() => {});
};

/** Lists whose changes the surfaces follow, by the first part of their key. */
const watchedQueries = new Set([
  'assignments',
  'notices',
  'courses',
  'semesterDates',
  'calendar',
]);

let scheduled = false;

/** Refreshes once after the changes made in this tick. */
const schedule = () => {
  if (scheduled) {
    return;
  }
  scheduled = true;
  setTimeout(() => {
    scheduled = false;
    void refreshSurfaces();
  }, 0);
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
  useUserDataStore.subscribe(schedule);
  useSettingsStore.subscribe(schedule);
  AppState.addEventListener('change', state => {
    if (state === 'active') {
      resumes += 1;
      schedule();
    }
  });
  schedule();
};
