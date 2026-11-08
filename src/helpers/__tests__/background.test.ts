import { ContentType } from 'thu-learn-lib';
import { assignmentsQuery, filesQuery, noticesQuery } from 'data/content';
import {
  mockAssignments,
  mockCourses,
  mockCurrentSemester,
  mockFiles,
  mockNotices,
} from 'data/mock';
import {
  defaultMockNetworkConfig,
  mockSource,
  setMockNetworkConfig,
} from 'data/mockSource';
import { coursesQuery } from 'data/queries';
import { clearQueryCache, queryClient } from 'data/queryClient';
import { loginWithFingerPrint } from 'data/source';
import {
  getUserData,
  resetUserData,
  setCurrentSemester,
  useUserDataStore,
} from 'data/userData';
import { notifyContent, syncContent } from 'helpers/background';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { defaultSettings, setSetting } from 'data/settings';
import { getNotifiedKeys, resetNotified } from 'data/notified';
import { ContentDiff } from 'data/contentDiff';

jest.mock('expo-background-task', () => ({
  BackgroundTaskResult: { Success: 1, Failed: 2 },
  registerTaskAsync: jest.fn(),
}));
jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }));
jest.mock('helpers/crashReporting', () => ({ recordError: jest.fn() }));

// The emulated server, as when a mock account is logged in.
jest.mock('data/source', () => ({
  dataSource: require('data/mockSource').mockSource,
  loginWithFingerPrint: jest.fn(() => Promise.resolve()),
}));

const mockCredentials = {
  username: 'user',
  password: 'password',
  fingerPrint: 'fp',
  fingerGenPrint: 'fp2',
  fingerGenPrint3: 'fp3',
};
let mockSavedCredentials: typeof mockCredentials | null = mockCredentials;
jest.mock('data/credentials', () => ({
  loadCredentials: () => Promise.resolve(mockSavedCredentials),
}));

const semesterId = mockCurrentSemester;
const courseIds = new Set(
  mockCourses.filter(c => c.semesterId === semesterId).map(c => c.id),
);
const inSemester = <T extends { courseId: string }>(items: T[]) =>
  items.filter(i => courseIds.has(i.courseId));

/** Syncs, and returns the diff of a sync that fetched something. */
const sync = async () => {
  const result = await syncContent();
  if (result.status !== 'synced') {
    throw new Error(`Sync ${result.status}`);
  }
  return result.diff;
};

const seed = async () => {
  await queryClient.fetchQuery(coursesQuery(semesterId));
  await queryClient.fetchQuery(noticesQuery(semesterId));
  await queryClient.fetchQuery(assignmentsQuery(semesterId));
  await queryClient.fetchQuery(filesQuery(semesterId));
};

beforeEach(() => {
  setMockNetworkConfig({ ...defaultMockNetworkConfig, latency: 'none' });
  clearQueryCache();
  resetUserData();
  setCurrentSemester(semesterId);
  mockSavedCredentials = mockCredentials;
  jest.restoreAllMocks();
  jest.mocked(loginWithFingerPrint).mockClear();
});

it('logs in with the saved credentials and refetches every list', async () => {
  await seed();
  const notice = inSemester(mockNotices)[0];
  const assignment = inSemester(mockAssignments).find(a => !a.graded)!;
  const file = inSemester(mockFiles)[0];
  // What the app last saw: one item of each missing, one assignment ungraded
  // but now graded.
  queryClient.setQueryData(noticesQuery(semesterId).queryKey, old =>
    old!.filter(n => n.id !== notice.id),
  );
  queryClient.setQueryData(filesQuery(semesterId).queryKey, old =>
    old!.filter(f => f.id !== file.id),
  );
  const graded = inSemester(mockAssignments).find(a => a.graded)!;
  queryClient.setQueryData(assignmentsQuery(semesterId).queryKey, old =>
    old!
      .filter(a => a.id !== assignment.id)
      .map(a => (a.id === graded.id ? { ...a, graded: false } : a)),
  );

  const diff = await sync();

  expect(loginWithFingerPrint).toHaveBeenCalledWith(
    'user',
    'password',
    'fp',
    'fp2',
    'fp3',
  );
  expect(diff.notices.added.map(n => n.id)).toEqual([notice.id]);
  expect(diff.files.added.map(f => f.id)).toEqual([file.id]);
  expect(diff.assignments.added.map(a => a.id)).toEqual([assignment.id]);
  expect(diff.assignments.graded.map(c => c.after.id)).toEqual([graded.id]);
  expect(diff.assignments.deadlineChanged).toEqual([]);
  // The cache now holds the fresh lists.
  expect(
    queryClient.getQueryData(noticesQuery(semesterId).queryKey)!.map(n => n.id),
  ).toContain(notice.id);
});

it('reports nothing new on the first sync', async () => {
  await queryClient.fetchQuery(coursesQuery(semesterId));
  const result = await syncContent();
  expect(result).toEqual({
    status: 'synced',
    diff: {
      notices: { added: [] },
      assignments: { added: [], graded: [], deadlineChanged: [] },
      files: { added: [] },
    },
  });
  expect(
    queryClient.getQueryData(filesQuery(semesterId).queryKey),
  ).toHaveLength(inSemester(mockFiles).length);
});

it('keeps the lists that fetched when another fails', async () => {
  await seed();
  queryClient.setQueryData(noticesQuery(semesterId).queryKey, []);
  const getAllContents = mockSource.getAllContents;
  jest
    .spyOn(mockSource, 'getAllContents')
    .mockImplementation((ids, type) =>
      type === ContentType.HOMEWORK
        ? Promise.reject(new Error('server error'))
        : getAllContents(ids, type),
    );
  const diff = await sync();
  expect(diff.notices.added).toHaveLength(inSemester(mockNotices).length);
  expect(diff.assignments.added).toEqual([]);
});

it('fails when every list fails', async () => {
  await seed();
  setMockNetworkConfig({ failure: 'serverError' });
  expect(await syncContent()).toEqual({ status: 'failed' });
});

it('skips without saved credentials, a semester, or cached courses', async () => {
  await queryClient.fetchQuery(coursesQuery(semesterId));
  mockSavedCredentials = null;
  expect(await syncContent()).toEqual({ status: 'skipped' });

  mockSavedCredentials = mockCredentials;
  resetUserData();
  expect(await syncContent()).toEqual({ status: 'skipped' });

  setCurrentSemester(semesterId);
  clearQueryCache();
  expect(await syncContent()).toEqual({ status: 'skipped' });
  expect(loginWithFingerPrint).not.toHaveBeenCalled();
});

it('skips when the login fails', async () => {
  await seed();
  jest.mocked(loginWithFingerPrint).mockRejectedValueOnce(new Error('no'));
  expect(await syncContent()).toEqual({ status: 'skipped' });
});

it("moves to the school's new semester when a term starts", async () => {
  const previous = '2025-2026-2';
  useUserDataStore.setState({
    currentSemester: previous,
    latestSemester: previous,
  });
  queryClient.setQueryData(coursesQuery(previous).queryKey, [
    { ...mockCourses[0], semesterId: previous },
  ]);

  const diff = await sync();

  expect(getUserData().currentSemester).toBe(semesterId);
  expect(queryClient.getQueryData(coursesQuery(semesterId).queryKey)).toEqual(
    mockCourses.filter(c => c.semesterId === semesterId),
  );
  // The new semester's first fetch reports nothing new.
  expect(diff.notices.added).toEqual([]);
  expect(
    queryClient.getQueryData(noticesQuery(semesterId).queryKey),
  ).toHaveLength(inSemester(mockNotices).length);
});

it('stays on a semester the user picked', async () => {
  const picked = '2025-2026-1';
  useUserDataStore.setState({
    currentSemester: picked,
    latestSemester: semesterId,
  });
  queryClient.setQueryData(coursesQuery(picked).queryKey, [
    { ...mockCourses[0], semesterId: picked },
  ]);
  await syncContent();
  expect(getUserData().currentSemester).toBe(picked);
});

describe('notifyContent', () => {
  const unread = {
    ...inSemester(mockNotices)[0],
    hasRead: false,
    publishTime: new Date().toISOString(),
  };
  const diff = (): ContentDiff => ({
    notices: { added: [unread] },
    assignments: { added: [], graded: [], deadlineChanged: [] },
    files: { added: [] },
  });
  const setAppState = (state: string) =>
    Object.defineProperty(AppState, 'currentState', {
      value: state,
      configurable: true,
    });

  beforeEach(() => {
    resetNotified();
    setSetting('notifications', {
      ...defaultSettings.notifications,
      notices: true,
    });
    jest.mocked(Notifications.scheduleNotificationAsync).mockClear();
    jest
      .mocked(Notifications.getPermissionsAsync)
      .mockResolvedValue({ granted: true, canAskAgain: true } as never);
    setAppState('background');
  });

  it('posts what the user turned on, once', async () => {
    await notifyContent(diff());
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(
      jest.mocked(Notifications.scheduleNotificationAsync).mock.calls[0][0]
        .content,
    ).toMatchObject({
      title: `${unread.courseName} · New notices`,
      body: unread.title,
      data: { type: 'notice', id: unread.id },
    });

    await notifyContent(diff());
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });

  it("doesn't post while the app is open, and remembers what it saw", async () => {
    setAppState('active');
    await notifyContent(diff());
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(getNotifiedKeys()).toContain(`notice:${unread.id}`);
  });

  it("doesn't post without the permission", async () => {
    jest
      .mocked(Notifications.getPermissionsAsync)
      .mockResolvedValue({ granted: false, canAskAgain: false } as never);
    await notifyContent(diff());
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('posts nothing with notifications off', async () => {
    setSetting('notifications', defaultSettings.notifications);
    await notifyContent(diff());
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(getNotifiedKeys().size).toBe(0);
  });
});
