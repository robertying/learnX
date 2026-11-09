import { assignmentsQuery, noticesQuery } from 'data/content';
import { mockAssignments, mockNotices } from 'data/mock';
import { clearQueryCache, queryClient } from 'data/queryClient';
import { getCachedWeekSessions } from 'data/schedule';
import { resetSettings, setSetting } from 'data/settings';
import { resetUserData, setArchived, setCurrentSemester } from 'data/userData';
import { syncDeadlineReminders } from 'helpers/deadlineReminders';
import { saveUpcomingClasses, saveUpcomingDeadlines } from 'helpers/shortcuts';
import { updateSpotlight } from 'helpers/spotlight';
import {
  clearSurfaces,
  refreshSurfaces,
  subscribeSurfaceErrors,
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
  expect(syncAssignments).toHaveBeenCalledWith(
    'calendar',
    assignments.slice(1),
  );
  expect(errors).toEqual([{ text: 'failed', type: 'error' }]);
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
