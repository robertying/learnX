import { Alert } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import dayjs from 'dayjs';
import { toast } from 'components/Toast';
import { mockAssignments } from 'data/mock';
import { getSettings, resetSettings } from 'data/settings';
import { resetUserData, setArchived } from 'data/userData';
import {
  deleteCalendars,
  exportCalendars,
  syncAssignments,
  syncCourseSchedule,
} from 'helpers/calendarSync';
import {
  confirmDeleteCalendars,
  useAssignmentSync,
  useCalendarExport,
  useCourseScheduleSync,
} from 'hooks/useCalendarSync';

jest.mock('components/Toast', () => ({ toast: jest.fn() }));
// Loaded by the real calendarSync below; native only.
jest.mock('helpers/files/share', () => ({ exportTextFile: jest.fn() }));
jest.mock('helpers/calendarSync', () => ({
  syncCourseSchedule: jest.fn(async () => undefined),
  syncAssignments: jest.fn(async () => undefined),
  exportCalendars: jest.fn(async () => undefined),
  deleteCalendars: jest.fn(async () => ({ text: 'Deleted', type: 'success' })),
  // The real filter, by deadline
  upcomingAssignments: jest.requireActual('helpers/calendarSync')
    .upcomingAssignments,
}));

const now = Date.parse('2026-11-10T00:00:00Z');
const assignments = [
  { ...mockAssignments[0], id: 'due', deadline: '2026-11-20T00:00:00Z' },
  { ...mockAssignments[0], id: 'past', deadline: '2026-11-01T00:00:00Z' },
  { ...mockAssignments[0], id: 'archived', deadline: '2026-11-20T00:00:00Z' },
];
jest.mock('data/content', () => ({
  useAssignments: () => ({ assignments: mockList }),
}));
let mockList: typeof assignments = [];

beforeEach(() => {
  jest.useFakeTimers({ now, doNotFake: ['nextTick', 'setImmediate'] });
  mockList = assignments;
  resetSettings();
  resetUserData();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useCourseScheduleSync', () => {
  it('starts with the next four weeks and syncs a confirmed range', async () => {
    const { result } = await renderHook(() => useCourseScheduleSync());
    const { startDate, endDate } = result.current.picker;
    expect(dayjs(endDate).diff(startDate, 'day')).toBe(28);

    await act(() => result.current.picker.openPicker());
    expect(result.current.picker.open).toBe(true);

    jest
      .mocked(syncCourseSchedule)
      .mockResolvedValueOnce({ text: 'Synced', type: 'success' });
    const start = new Date('2026-11-16');
    const end = new Date('2026-11-22');
    await act(async () =>
      result.current.picker.onRangeConfirm({ startDate: start, endDate: end }),
    );
    expect(result.current.picker.open).toBe(false);
    expect(result.current.picker.startDate).toBe(start);
    expect(syncCourseSchedule).toHaveBeenCalledWith(
      dayjs(start),
      dayjs(end),
      false,
    );
    expect(toast).toHaveBeenCalledWith('Synced', 'success');
    expect(result.current.syncing).toBe(false);
  });

  it('waits for both ends of the range', async () => {
    const { result } = await renderHook(() => useCourseScheduleSync());
    await act(async () =>
      result.current.picker.onRangeConfirm({
        startDate: new Date(),
        endDate: undefined,
      }),
    );
    expect(syncCourseSchedule).not.toHaveBeenCalled();
    expect(result.current.picker.endDate).toBeUndefined();
  });

  it('closes without syncing', async () => {
    const { result } = await renderHook(() => useCourseScheduleSync());
    await act(() => result.current.picker.openPicker());
    await act(() => result.current.picker.closePicker());
    expect(result.current.picker.open).toBe(false);
    expect(syncCourseSchedule).not.toHaveBeenCalled();
  });
});

describe('useAssignmentSync', () => {
  it('syncs the shown assignments still due when turned on', async () => {
    setArchived('assignment', ['archived'], true);
    const { result } = await renderHook(() => useAssignmentSync());
    await act(() => result.current.setSyncEnabled('calendar', true));
    expect(jest.mocked(syncAssignments).mock.calls[0][0]).toBe('calendar');
    expect(
      jest.mocked(syncAssignments).mock.calls[0][1].map(a => a.id),
    ).toEqual(['due']);
    expect(getSettings().assignmentCalendarSync).toBe(true);
    expect(result.current.calendarSyncing).toBe(false);
  });

  it('only saves the setting when turned off', async () => {
    const { result } = await renderHook(() => useAssignmentSync());
    await act(() => result.current.setSyncEnabled('reminder', true));
    await act(() => result.current.setSyncEnabled('reminder', false));
    expect(syncAssignments).toHaveBeenCalledTimes(1);
    expect(getSettings().assignmentReminderSync).toBe(false);
  });

  it('shows a failure', async () => {
    jest
      .mocked(syncAssignments)
      .mockResolvedValueOnce({ text: 'No permission', type: 'error' });
    const { result } = await renderHook(() => useAssignmentSync());
    await act(() => result.current.setSyncEnabled('reminder', true));
    expect(toast).toHaveBeenCalledWith('No permission', 'error');
  });
});

it('exports the calendars, showing the result', async () => {
  jest
    .mocked(exportCalendars)
    .mockResolvedValueOnce({ text: 'Saved', type: 'success' });
  const { result } = await renderHook(() => useCalendarExport());
  await act(() => result.current.exportToICS());
  expect(toast).toHaveBeenCalledWith('Saved', 'success');
  expect(result.current.exporting).toBe(false);
});

it('deletes the calendars only once confirmed', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  confirmDeleteCalendars();
  const buttons = alert.mock.calls[0][2]!;
  expect(buttons.map(b => b.style)).toEqual(['cancel', 'destructive']);
  expect(deleteCalendars).not.toHaveBeenCalled();
  await buttons[1].onPress!();
  expect(deleteCalendars).toHaveBeenCalled();
  expect(toast).toHaveBeenCalledWith('Deleted', 'success');
});
