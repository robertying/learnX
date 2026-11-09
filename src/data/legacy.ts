import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  defaultSettings,
  mergeSettings,
  useSettingsStore,
} from 'data/settings';
import { kvStorage } from 'data/storage';
import { SettingsState } from 'data/types/state';
import {
  BookmarkType,
  bookmarkTypes,
  emptyUserData,
  favoritesToActions,
  mergeUserData,
  UserData,
  useUserDataStore,
} from 'data/userData';

/**
 * Up to 18.0.x redux-persist kept user data in AsyncStorage: settings under
 * their own key, and favorites, archives, hidden courses and the course order
 * inside the slices of the root key, with the semester being shown.
 */
export const LEGACY_ROOT_KEY = 'persist:root';
export const LEGACY_SETTINGS_KEY = 'persist:settings';

/** Set in the key-value store once the legacy data has been read. */
export const LEGACY_IMPORTED_KEY = 'legacyUserDataImported';

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string');

/**
 * redux-persist stores an object whose values are themselves JSON strings,
 * e.g. `{"graduate":"true","alarms":"{\"courseAlarm\":false}"}`. Keys that
 * don't parse are skipped.
 */
export const parseLegacyPersist = (raw: string | null): Json | null => {
  if (!raw) {
    return null;
  }
  try {
    const outer: unknown = JSON.parse(raw);
    if (!isObject(outer)) {
      return null;
    }
    const result: Json = {};
    for (const [key, value] of Object.entries(outer)) {
      if (key === '_persist' || typeof value !== 'string') {
        continue;
      }
      try {
        result[key] = JSON.parse(value);
      } catch {}
    }
    return result;
  } catch {
    return null;
  }
};

const isStringRecord = (value: unknown): value is Record<string, string> =>
  isObject(value) &&
  Object.values(value).every(item => typeof item === 'string');

/** Settings whose default is undefined, with the type they must have. */
const optionalSettings: Partial<
  Record<keyof SettingsState, 'string' | 'number' | 'record'>
> = {
  calendarEventLength: 'number',
  assignmentCalendarId: 'string',
  assignmentReminderId: 'string',
  courseCalendarId: 'string',
  syncedCalendarAssignments: 'record',
  syncedReminderAssignments: 'record',
};

/** Keeps the saved settings whose type matches what the app expects. */
export const legacySettings = (saved: Json): Partial<SettingsState> => {
  const result: Json = {};
  for (const [key, value] of Object.entries(saved)) {
    if (key === 'newUpdate') {
      continue;
    }
    const optional = optionalSettings[key as keyof SettingsState];
    const fallback = defaultSettings[key as keyof SettingsState];
    const valid =
      optional === 'record'
        ? isStringRecord(value)
        : optional
          ? typeof value === optional
          : key === 'lastShowChangelogVersion'
            ? typeof value === 'string' || value === null
            : isObject(fallback)
              ? isObject(value)
              : fallback !== undefined && typeof value === typeof fallback;
    if (valid) {
      result[key] = value;
    }
  }
  return result as Partial<SettingsState>;
};

/** Picks the user's own data out of the slices of the legacy root. */
export const legacyUserData = (root: Json): Partial<UserData> => {
  const result: Partial<UserData> = {};

  const semesters = root.semesters;
  if (isObject(semesters) && typeof semesters.current === 'string') {
    result.currentSemester = semesters.current;
  }

  const courses = root.courses;
  if (isObject(courses)) {
    if (isStringArray(courses.hidden)) {
      result.hiddenCourses = courses.hidden;
    }
    if (isStringArray(courses.order)) {
      result.courseOrder = courses.order;
    }
  }

  const slices: Record<BookmarkType, string> = {
    notice: 'notices',
    assignment: 'assignments',
    file: 'files',
  };
  for (const type of bookmarkTypes) {
    const slice = root[slices[type]];
    if (!isObject(slice)) {
      continue;
    }
    if (isStringArray(slice.favorites)) {
      // Sent to the website's favorites, like any favorite kept on the phone.
      result.pendingActions = [
        ...(result.pendingActions ?? []),
        ...favoritesToActions({ [type]: slice.favorites }),
      ];
    }
    if (isStringArray(slice.archived)) {
      result.archived ??= emptyUserData().archived;
      result.archived[type] = [...new Set(slice.archived)];
    }
  }

  return result;
};

/**
 * Builds from before the semester being shown moved to the user data imported
 * the rest without it and kept the root. Takes it from there if it is still
 * missing.
 */
const importLegacySemester = async () => {
  if (useUserDataStore.getState().currentSemester) {
    return;
  }
  const root = parseLegacyPersist(await AsyncStorage.getItem(LEGACY_ROOT_KEY));
  const currentSemester = root && legacyUserData(root).currentSemester;
  if (currentSemester) {
    useUserDataStore.setState({ currentSemester });
  }
};

const importLegacy = async () => {
  if (kvStorage.getItem(LEGACY_IMPORTED_KEY)) {
    await importLegacySemester();
    // Those builds also left the root behind; nothing reads it after this.
    await AsyncStorage.removeItem(LEGACY_ROOT_KEY);
    return;
  }

  const [rawRoot, rawSettings] = await Promise.all([
    AsyncStorage.getItem(LEGACY_ROOT_KEY),
    AsyncStorage.getItem(LEGACY_SETTINGS_KEY),
  ]);

  const settings = parseLegacyPersist(rawSettings);
  if (settings) {
    useSettingsStore.setState(current =>
      mergeSettings(current, legacySettings(settings)),
    );
  }

  const root = parseLegacyPersist(rawRoot);
  if (root) {
    useUserDataStore.setState(current =>
      mergeUserData(current, legacyUserData(root)),
    );
  }

  // The stores wrote synchronously above, so the import is done. The server
  // data in the root key is fetched again into the query cache.
  kvStorage.setItem(LEGACY_IMPORTED_KEY, '1');
  if (rawRoot || rawSettings) {
    await AsyncStorage.multiRemove([LEGACY_ROOT_KEY, LEGACY_SETTINGS_KEY]);
  }
};

let importing: Promise<void> | null = null;

/**
 * Moves user data saved by 18.0.x into the new stores, once. Later calls share
 * the first run; it never rejects, and a failed run retries on next launch.
 */
export const importLegacyUserData = () => {
  importing ??= importLegacy().catch(() => {
    importing = null;
  });
  return importing;
};
