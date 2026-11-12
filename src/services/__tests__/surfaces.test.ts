import { assignmentsQuery, noticesQuery } from 'data/content';
import { mockAssignments, mockNotices } from 'data/mock';
import { clearQueryCache, queryClient } from 'data/queryClient';
import { getCachedWeekSessions } from 'data/schedule';
import { resetSettings, setSetting } from 'data/settings';
import { resetUserData, setArchived, setCurrentSemester } from 'data/userData';
import {
  cancelClassReminders,
  syncClassReminders,
} from 'services/classReminders';
import { syncDeadlineReminders } from 'services/deadlineReminders';
import { saveUpcomingClasses, saveUpcomingDeadlines } from 'services/shortcuts';
import { updateSpotlight } from 'services/spotlight';
import { AppState, type AppStateStatus } from 'react-native';
import { recordError } from 'services/crashReporting';
import {
  clearSurfaces,
  refreshSurfaces,
  subscribeSurfaceErrors,
  watchSurfaces,
} from 'services/surfaces';
import { updateDeadlineWidget, updateUpNextWidget } from 'widgets';

jest.mock('data/source', () => ({
  dataSource: require('data/mockSource').mockSource,
}));
jest.mock('services/crashReporting', () => ({ recordError: jest.fn() }));
jest.mock('widgets', () => ({
  updateDeadlineWidget: jest.fn(),
  updateUpNextWidget: jest.fn(),
}));
jest.mock('services/spotlight', () => ({
  updateSpotlight: jest.fn(async () => {}),
  clearSpotlight: jest.fn(),
}));
jest.mock('services/shortcuts', () => ({
  saveUpcomingDeadlines: jest.fn(),
  saveUpcomingClasses: jest.fn(),
  clearShortcuts: jest.fn(),
}));
jest.mock('services/deadlineReminders', () => ({
  syncDeadlineReminders: jest.fn(async () => {}),
  cancelDeadlineReminders: jest.fn(async () => {}),
}));
jest.mock('services/classReminders', () => ({
  syncClassReminders: jest.fn(async () => {}),
  cancelClassReminders: jest.fn(async () => {}),
}));
jest.mock('services/calendar/actions', () => ({
  syncAssignments: jest.fn(async () => undefined),
  upcomingAssignments: (assignments: unknown[]) => assignments,
}));
jest.mock('services/coursex', () => ({
  uploadCourses: jest.fn(async () => {}),
}));
jest.mock('data/schedule', () => ({
  getCachedWeekSessions: jest.fn(() => ({ sessions: [], source: 'none' })),
}));

const { syncAssignments } = jest.requireMock('services/calendar/actions') as {
  syncAssignments: jest.Mock;
};

const semester = 'semester';
const assignments = mockAssignments.slice(0, 3).map(a => ({
  ...a,
  courseId: a.courseId ?? 'course',
}));

const cacheAssignments = (list = assignments) =>
  queryClient.setQueryData(assignmentsQuery(semester).queryKey, list as never);

beforeEach(async () => {
  clearQueryCache();
  resetUserData();
  resetSettings();
  setCurrentSemester(semester);
  await clearSurfaces();
  jest.clearAllMocks();
});

it('keeps what the outputs had until the lists are loaded', async () => {
  await refreshSurfaces();
  expect(updateDeadlineWidget).not.toHaveBeenCalled();
  expect(syncDeadlineReminders).not.toHaveBeenCalled();
  expect(saveUpcomingDeadlines).not.toHaveBeenCalled();
  expect(updateUpNextWidget).not.toHaveBeenCalled();
});

it('updates every output from the cached lists, once per change', async () => {
  cacheAssignments();
  queryClient.setQueryData(
    noticesQuery(semester).queryKey,
    mockNotices.slice(0, 2) as never,
  );
  await refreshSurfaces();

  expect(updateDeadlineWidget).toHaveBeenCalledWith(assignments, {
    hiddenCourses: [],
    archived: [],
  });
  expect(syncDeadlineReminders).toHaveBeenCalledTimes(1);
  expect(updateSpotlight).toHaveBeenCalledTimes(1);
  expect(saveUpcomingDeadlines).toHaveBeenCalledTimes(1);

  await refreshSurfaces();
  expect(updateDeadlineWidget).toHaveBeenCalledTimes(1);
  expect(syncDeadlineReminders).toHaveBeenCalledTimes(1);
  expect(updateSpotlight).toHaveBeenCalledTimes(1);
});

it('follows archiving, without indexing Spotlight again', async () => {
  cacheAssignments();
  await refreshSurfaces();
  setArchived('assignment', [assignments[0].id], true);
  await refreshSurfaces();

  expect(updateDeadlineWidget).toHaveBeenLastCalledWith(assignments, {
    hiddenCourses: [],
    archived: [assignments[0].id],
  });
  expect(syncDeadlineReminders).toHaveBeenCalledTimes(2);
  expect(saveUpcomingDeadlines).toHaveBeenCalledTimes(2);
  expect(updateSpotlight).toHaveBeenCalledTimes(1);
});

it('writes shown assignments to the calendar only when the sync is on', async () => {
  cacheAssignments();
  await refreshSurfaces();
  expect(syncAssignments).not.toHaveBeenCalled();

  setArchived('assignment', [assignments[0].id], true);
  setSetting('assignmentCalendarSync', true);
  const errors: unknown[] = [];
  const unsubscribe = subscribeSurfaceErrors(message => errors.push(message));
  syncAssignments.mockResolvedValueOnce({ text: 'failed', type: 'error' });
  await refreshSurfaces();
  unsubscribe();

  expect(syncAssignments).toHaveBeenCalledTimes(1);
  // The archived one's entry is removed.
  expect(syncAssignments).toHaveBeenCalledWith(
    'calendar',
    assignments.slice(1),
    [assignments[0].id],
    { automatic: true },
  );
  expect(errors).toEqual([{ text: 'failed', type: 'error' }]);
});

it('writes shown assignments to Reminders when that sync is on, quietly when it works', async () => {
  cacheAssignments();
  setSetting('assignmentReminderSync', true);
  const errors: unknown[] = [];
  const unsubscribe = subscribeSurfaceErrors(message => errors.push(message));
  await refreshSurfaces();
  unsubscribe();
  expect(syncAssignments).toHaveBeenCalledWith('reminder', assignments, [], {
    automatic: true,
  });
  expect(errors).toEqual([]);
});

it('writes the calendar and Reminders again only when their data changed', async () => {
  cacheAssignments();
  setSetting('assignmentCalendarSync', true);
  setSetting('assignmentReminderSync', true);
  await refreshSurfaces();
  expect(syncAssignments).toHaveBeenCalledTimes(2);

  // Other lists, other settings and coming back to the app change nothing.
  queryClient.setQueryData(
    noticesQuery(semester).queryKey,
    mockNotices.slice(0, 1) as never,
  );
  setSetting('graduate', true);
  await refreshSurfaces();
  await refreshSurfaces();
  expect(syncAssignments).toHaveBeenCalledTimes(2);

  setArchived('assignment', [assignments[1].id], true);
  await refreshSurfaces();
  expect(syncAssignments).toHaveBeenCalledTimes(4);
});

it('has no lists to show without a semester', async () => {
  cacheAssignments();
  setCurrentSemester(undefined as never);
  setSetting('assignmentReminderSync', true);
  await refreshSurfaces();
  expect(syncAssignments).not.toHaveBeenCalled();
});

it('feeds Up Next once the week is known', async () => {
  cacheAssignments();
  const start = Date.now() + 60 * 60 * 1000;
  jest.mocked(getCachedWeekSessions).mockReturnValue({
    source: 'courses',
    sessions: [
      {
        key: 'a',
        courseName: 'Course',
        location: 'Room',
        start,
        end: start + 60 * 60 * 1000,
      } as never,
    ],
  });
  await refreshSurfaces();

  expect(saveUpcomingClasses).toHaveBeenCalledWith([
    expect.objectContaining({ courseName: 'Course', start }),
  ]);
  expect(updateUpNextWidget).toHaveBeenCalledTimes(1);
  expect(syncClassReminders).toHaveBeenCalledWith(
    [expect.objectContaining({ courseName: 'Course', start })],
    { settings: expect.objectContaining({ classReminders: false }) },
  );
});

it('keeps the class reminders until the week is known', async () => {
  jest
    .mocked(getCachedWeekSessions)
    .mockReturnValue({ sessions: [], source: 'none' });
  cacheAssignments();
  await refreshSurfaces();
  expect(syncClassReminders).not.toHaveBeenCalled();
});

it('cancels the class reminders when cleared', async () => {
  await clearSurfaces();
  expect(cancelClassReminders).toHaveBeenCalled();
});

it('runs again after being cleared', async () => {
  cacheAssignments();
  await refreshSurfaces();
  await clearSurfaces();
  await refreshSurfaces();
  expect(syncDeadlineReminders).toHaveBeenCalledTimes(2);
});

it('records a failed output and tries it again on the next refresh', async () => {
  cacheAssignments();
  jest
    .mocked(syncDeadlineReminders)
    .mockRejectedValueOnce(new Error('no permission'));
  await refreshSurfaces();
  expect(recordError).toHaveBeenCalledWith(
    new Error('no permission'),
    'Updating Deadline reminders',
  );
  // The others still ran.
  expect(updateSpotlight).toHaveBeenCalledTimes(1);

  await refreshSurfaces();
  expect(syncDeadlineReminders).toHaveBeenCalledTimes(2);
  expect(updateSpotlight).toHaveBeenCalledTimes(1);
});

describe('watchSurfaces', () => {
  const addListener = jest.spyOn(AppState, 'addEventListener');
  // Watching starts once per runtime; beforeEach clears the call record.
  let onChange: (state: AppStateStatus) => void;
  /** Lets the refresh scheduled for this tick run. */
  const settle = async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
    await refreshSurfaces();
  };

  it('refreshes after watched lists, settings and user data change', async () => {
    watchSurfaces();
    watchSurfaces();
    expect(addListener).toHaveBeenCalledTimes(1);
    onChange = addListener.mock.calls[0][1];
    await settle();

    cacheAssignments();
    await settle();
    expect(updateDeadlineWidget).toHaveBeenCalledTimes(1);

    setArchived('assignment', [assignments[0].id], true);
    await settle();
    expect(updateDeadlineWidget).toHaveBeenCalledTimes(2);

    // Several changes in one tick refresh once.
    setArchived('assignment', [assignments[1].id], true);
    setArchived('assignment', [assignments[2].id], true);
    await settle();
    expect(updateDeadlineWidget).toHaveBeenCalledTimes(3);
    expect(updateDeadlineWidget).toHaveBeenLastCalledWith(assignments, {
      hiddenCourses: [],
      archived: assignments.map(a => a.id),
    });
  });

  it('syncs the reminders again when the app comes back', async () => {
    cacheAssignments();
    await refreshSurfaces();
    expect(syncDeadlineReminders).toHaveBeenCalledTimes(1);

    onChange('background');
    await settle();
    expect(syncDeadlineReminders).toHaveBeenCalledTimes(1);

    onChange('active');
    await settle();
    expect(syncDeadlineReminders).toHaveBeenCalledTimes(2);
  });
});

it('clears only after a refresh under way has finished', async () => {
  const { cancelDeadlineReminders } = jest.requireMock(
    'services/deadlineReminders',
  ) as { cancelDeadlineReminders: jest.Mock };
  const order: string[] = [];
  let finishSync!: () => void;
  jest.mocked(syncDeadlineReminders).mockImplementationOnce(
    () =>
      new Promise<void>(resolve => {
        finishSync = () => {
          order.push('scheduled');
          resolve();
        };
      }),
  );
  cancelDeadlineReminders.mockImplementationOnce(async () => {
    order.push('cancelled');
  });
  cacheAssignments();

  const refreshed = refreshSurfaces();
  const cleared = clearSurfaces();
  // Let the refresh reach the reminders before it's let go.
  await new Promise(resolve => setTimeout(resolve, 0));
  finishSync();
  await Promise.all([refreshed, cleared]);

  expect(order).toEqual(['scheduled', 'cancelled']);
});

it('shares the courses with courseX while sharing is on, once per change', async () => {
  const { uploadCourses } = jest.requireMock('services/coursex') as {
    uploadCourses: jest.Mock;
  };
  const { coursesQuery } = jest.requireActual('data/queries');
  const courses = [{ id: 'c1', name: '微积分', semesterId: semester }];
  queryClient.setQueryData(coursesQuery(semester).queryKey, courses);

  await refreshSurfaces();
  expect(uploadCourses).not.toHaveBeenCalled();

  setSetting('courseInformationSharing', true);
  await refreshSurfaces();
  await refreshSurfaces();
  expect(uploadCourses).toHaveBeenCalledTimes(1);
  expect(uploadCourses).toHaveBeenCalledWith(courses);

  queryClient.setQueryData(coursesQuery(semester).queryKey, [
    ...courses,
    { id: 'c2', name: '物理', semesterId: semester },
  ]);
  await refreshSurfaces();
  expect(uploadCourses).toHaveBeenCalledTimes(2);
});
