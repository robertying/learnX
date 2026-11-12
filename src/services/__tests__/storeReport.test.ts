import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';
import * as SecureStore from 'expo-secure-store';
import { Directory } from 'expo-file-system';
import { Platform } from 'react-native';
import {
  resetAppState,
  setSetupSeen,
  setWhatsNewSeen,
  useAppStateStore,
} from 'data/appState';
import {
  resetCalendarSync,
  setEventIdForAssignment,
  setLastSynced,
  setSyncedCalendarId,
} from 'data/calendarSync';
import { LEGACY_AUTH_KEY, useCredentialsStore } from 'data/credentials';
import { LEGACY_IMPORTED_KEY, LEGACY_ROOT_KEY } from 'data/legacy';
import { resetSettings, setSetting } from 'data/settings';
import { kvStorage } from 'data/storage';
import { queueAction, resetUserData, setArchived } from 'data/userData';
import { buildStoreReport } from 'services/storeReport';
import { whatsNewContext } from 'helpers/whatsNew';

const mocked = Calendar as unknown as {
  [K in keyof typeof import('../../../jest/mocks/expoCalendar')]: jest.Mock;
};
const os = Platform.OS;

const calendar = (id: string, title: string, entries: number) => ({
  id,
  title,
  listEvents: jest.fn(async () => Array.from({ length: entries })),
  listReminders: jest.fn(async () => Array.from({ length: entries })),
});

beforeEach(async () => {
  Platform.OS = 'ios';
  resetSettings();
  resetUserData();
  resetAppState();
  resetCalendarSync();
  useAppStateStore.setState({ whatsNewSeenVersion: null });
  useCredentialsStore.setState({ credentials: null });
  await AsyncStorage.clear();
  (SecureStore as unknown as { __store: Map<string, string> }).__store.clear();
  kvStorage.removeItem(LEGACY_IMPORTED_KEY);
  mocked.getCalendarPermissions.mockResolvedValue({ status: 'granted' });
  mocked.getRemindersPermissions.mockResolvedValue({ status: 'granted' });
});

afterEach(() => {
  Platform.OS = os;
});

it('reports the stores without the password or times', async () => {
  useCredentialsStore.setState({
    credentials: {
      username: 'mock-user',
      password: 'secret',
      fingerPrint: 'fingerPrint',
      fingerGenPrint: '',
      fingerGenPrint3: '',
    },
  });
  setSetting('graduate', true);
  setArchived('notice', ['n1'], true);
  queueAction({ kind: 'favorite', type: 'file', id: 'f1', flag: true });
  setSetupSeen();
  setLastSynced('calendar', 123);
  kvStorage.setItem(LEGACY_IMPORTED_KEY, '1');
  mocked.getCalendars.mockResolvedValue([]);

  const report = await buildStoreReport();

  expect(report.credentials).toEqual({
    username: 'mock-user',
    hasPassword: true,
    fingerPrint: 'fingerPrint',
  });
  expect(JSON.stringify(report)).not.toContain('secret');
  expect(report.settings.graduate).toBe(true);
  expect(report.userData.archived.notice).toEqual(['n1']);
  expect(report.userData.pendingActions).toEqual([
    { kind: 'favorite', type: 'file', id: 'f1', flag: true, tries: 0 },
  ]);
  expect(report.appState.setupSeen).toBe(true);
  expect(report.calendarSync.lastSynced).toEqual(['calendar']);
  expect(report.marks.legacyImported).toBe(true);
  expect(report.legacyLeft).toEqual({
    root: false,
    settings: false,
    auth: false,
    downloads: false,
    documentDownloads: false,
  });
});

it("reports no What's New once the running version's is seen", async () => {
  setWhatsNewSeen(whatsNewContext().version);
  mocked.getCalendars.mockResolvedValue([]);

  const report = await buildStoreReport();

  expect(report.whatsNew).toBeNull();
});

it("reports what is left of 18.0.x's storage", async () => {
  await AsyncStorage.setItem(LEGACY_ROOT_KEY, '{}');
  await SecureStore.setItemAsync(LEGACY_AUTH_KEY, '{}');
  mocked.getCalendars.mockResolvedValue([]);

  const report = await buildStoreReport();

  expect(report.credentials).toBeNull();
  expect(report.legacyLeft).toMatchObject({
    root: true,
    settings: false,
    auth: true,
  });
});

it('reports the synced calendars, their entries and duplicates', async () => {
  setSyncedCalendarId('assignmentCalendarId', 'a');
  setSyncedCalendarId('assignmentReminderId', 'r');
  setEventIdForAssignment('calendar', 'hw1', 'e1');
  mocked.getCalendars.mockImplementation(async type =>
    type === Calendar.EntityTypes.REMINDER
      ? [calendar('r', 'learnX 作业', 4)]
      : [
          calendar('a', 'learnX 作业', 2),
          calendar('b', 'learnX 作业', 0),
          calendar('c', 'Home', 9),
        ],
  );

  const report = await buildStoreReport();

  expect(report.calendarSync.syncedCalendarAssignments).toEqual({
    hw1: 'e1',
  });
  expect(report.calendars).toEqual({
    course: { saved: false, withTitle: 0, entries: 0 },
    assignment: { saved: true, withTitle: 2, entries: 2 },
    reminder: { saved: true, withTitle: 1, entries: 4 },
  });
});

it('leaves the calendars out without access, and Reminders on Android', async () => {
  Platform.OS = 'android';
  mocked.getCalendarPermissions.mockResolvedValue({ status: 'denied' });

  const report = await buildStoreReport();

  expect(report.calendars).toEqual({
    course: null,
    assignment: null,
    reminder: null,
  });
  expect(mocked.getCalendars).not.toHaveBeenCalled();
});

it("reports 18.0.x's download folders until they are deleted", async () => {
  mocked.getCalendars.mockResolvedValue([]);
  const exists = jest
    .spyOn(Directory.prototype, 'exists', 'get')
    .mockReturnValueOnce(true)
    .mockImplementationOnce(() => {
      throw new Error('no access');
    });

  const report = await buildStoreReport();

  expect(report.legacyLeft).toMatchObject({
    downloads: true,
    documentDownloads: false,
  });
  exists.mockRestore();
});
