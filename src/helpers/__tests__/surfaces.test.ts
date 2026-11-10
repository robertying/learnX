import { assignmentsQuery, noticesQuery } from 'data/content';
import { mockAssignments, mockNotices } from 'data/mock';
import { clearQueryCache, queryClient } from 'data/queryClient';
import { getCachedWeekSessions } from 'data/schedule';
import { resetSettings, setSetting } from 'data/settings';
import { resetUserData, setArchived, setCurrentSemester } from 'data/userData';
import { syncDeadlineReminders } from 'helpers/deadlineReminders';
import { saveUpcomingClasses, saveUpcomingDeadlines } from 'helpers/shortcuts';
import { updateSpotlight } from 'helpers/spotlight';
import { AppState, type AppStateStatus } from 'react-native';
import { recordError } from 'helpers/crashReporting';
import {
  clearSurfaces,
  refreshSurfaces,
  subscribeSurfaceErrors,
  watchSurfaces,
} from 'helpers/surfaces';
import { updateDeadlineWidget, updateUpNextWidget } from 'widgets';

jest.mock('data/source', () => ({
  dataSource: require('data/mockSource').mockSource,
}));
jest.mock('helpers/crashReporting', () => ({ recordError: jest.fn() }));
jest.mock('widgets', () => ({
  updateDeadlineWidget: jest.fn(),
  updateUpNextWidget: jest.fn(),
}));
jest.mock('helpers/spotlight', () => ({
  updateSpotlight: jest.fn(async () => {}),
  clearSpotlight: jest.fn(),
}));
jest.mock('helpers/shortcuts', () => ({
  saveUpcomingDeadlines: jest.fn(),
  saveUpcomingClasses: jest.fn(),
  clearShortcuts: jest.fn(),
}));
jest.mock('helpers/deadlineReminders', () => ({
  syncDeadlineReminders: jest.fn(async () => {}),
  cancelDeadlineReminders: jest.fn(async () => {}),
}));
jest.mock('helpers/calendarSync', () => ({
  syncAssignments: jest.fn(async () => undefined),
  upcomingAssignments: (assignments: unknown[]) => assignments,
}));
jest.mock('data/schedule', () => ({
  getCachedWeekSessions: jest.fn(() => ({ sessions: [], source: 'none' })),
}));

const { syncAssignments } = jest.requireMock('helpers/calendarSync') as {
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
  expect(syncAssignments).toHaveBeenCalledWith('reminder', assignments, []);
  expect(errors).toEqual([]);
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
