import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';
import * as SecureStore from 'expo-secure-store';
import { Directory, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { useAppStateStore } from 'data/appState';
import { getCalendarSync } from 'data/calendarSync';
import { getCredentials, LEGACY_AUTH_KEY } from 'data/credentials';
import { getDataOwner } from 'data/dataOwner';
import { INSTALLED_KEY } from 'data/install';
import {
  LEGACY_IMPORTED_KEY,
  LEGACY_ROOT_KEY,
  LEGACY_SETTINGS_KEY,
} from 'data/legacy';
import { getSettings } from 'data/settings';
import { kvStorage } from 'data/storage';
import { getUserData } from 'data/userData';
import { LEGACY_DOWNLOADS_DIR } from 'helpers/files/downloads';
import {
  assignmentCalendarReminderName,
  courseCalendarName,
} from 'helpers/eventDetails';
import { hasPermission } from 'helpers/event';

/** A synced calendar as the phone has it. */
interface CalendarReport {
  /** The calendar learnX saved is still on the phone. */
  saved: boolean;
  /** Calendars with learnX's title, so a duplicate shows as more than 1. */
  withTitle: number;
  /** Events or reminders in the saved calendar. */
  entries: number;
}

const RANGE_YEARS = 2;

const calendarReport = async (
  id: string | undefined,
  title: string,
  entityType: Calendar.EntityTypes,
): Promise<CalendarReport | null> => {
  if (
    !(await hasPermission(
      entityType === Calendar.EntityTypes.REMINDER ? 'reminder' : 'calendar',
    ))
  ) {
    return null;
  }
  const calendars = await Calendar.getCalendars(entityType);
  const calendar = id && calendars.find(item => item.id === id);
  let entries = 0;
  if (calendar) {
    const start = new Date();
    start.setFullYear(start.getFullYear() - RANGE_YEARS);
    const end = new Date();
    end.setFullYear(end.getFullYear() + RANGE_YEARS);
    entries = (
      entityType === Calendar.EntityTypes.REMINDER
        ? await calendar.listReminders()
        : await calendar.listEvents(start, end)
    ).length;
  }
  return {
    saved: !!calendar,
    withTitle: calendars.filter(item => item.title === title).length,
    entries,
  };
};

const exists = (base: Directory) => {
  try {
    return new Directory(base, LEGACY_DOWNLOADS_DIR).exists;
  } catch {
    return false;
  }
};

/**
 * Everything the app keeps about the user, for the upgrade test
 * (`.maestro/upgrade`): the stores, what is left of 18.0.x's storage, and the
 * calendars the sync made. The password is never included.
 */
export const buildStoreReport = async () => {
  const credentials = getCredentials();
  const calendarSync = getCalendarSync();
  const [legacyRoot, legacySettings, legacyAuth] = await Promise.all([
    AsyncStorage.getItem(LEGACY_ROOT_KEY),
    AsyncStorage.getItem(LEGACY_SETTINGS_KEY),
    SecureStore.getItemAsync(LEGACY_AUTH_KEY),
  ]);
  const { pendingActions, ...userData } = getUserData();

  return {
    credentials: credentials && {
      username: credentials.username,
      hasPassword: !!credentials.password,
      fingerPrint: credentials.fingerPrint,
    },
    dataOwner: getDataOwner(),
    marks: {
      installed: !!kvStorage.getItem(INSTALLED_KEY),
      legacyImported: !!kvStorage.getItem(LEGACY_IMPORTED_KEY),
    },
    legacyLeft: {
      root: !!legacyRoot,
      settings: !!legacySettings,
      auth: !!legacyAuth,
      downloads: exists(Paths.cache),
      documentDownloads: exists(Paths.document),
    },
    settings: getSettings(),
    userData: {
      ...userData,
      // Without the times and tries, which differ from run to run.
      pendingActions: pendingActions.map(pending => {
        const { queuedAt: _queued, tries: _tries, ...action } = pending;
        return action;
      }),
    },
    appState: useAppStateStore.getState(),
    calendarSync: {
      ...calendarSync,
      lastSynced: Object.keys(calendarSync.lastSynced ?? {}).sort(),
    },
    calendars: {
      course: await calendarReport(
        calendarSync.courseCalendarId,
        courseCalendarName,
        Calendar.EntityTypes.EVENT,
      ),
      assignment: await calendarReport(
        calendarSync.assignmentCalendarId,
        assignmentCalendarReminderName,
        Calendar.EntityTypes.EVENT,
      ),
      // Android has no Reminders: its reminder sync writes to the
      // assignment calendar.
      reminder:
        Platform.OS === 'ios'
          ? await calendarReport(
              calendarSync.assignmentReminderId,
              assignmentCalendarReminderName,
              Calendar.EntityTypes.REMINDER,
            )
          : null,
    },
  };
};

export type StoreReport = Awaited<ReturnType<typeof buildStoreReport>>;
