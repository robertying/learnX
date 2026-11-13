import { Alert } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import dayjs from 'dayjs';
import { toast } from 'components/Toast';
import { getSettings, resetSettings } from 'data/settings';
import {
  allowAssignmentSync,
  allowCourseCalendarSync,
  deleteCalendars,
  exportCalendars,
  syncCourseSchedule,
} from 'services/calendar/actions';
import { refreshSurfaces } from 'services/surfaces';
import {
  confirmDeleteCalendars,
  useAssignmentSync,
  useCalendarExport,
  useCourseScheduleSync,
} from 'hooks/useCalendarSync';

jest.mock('components/Toast', () => ({ toast: jest.fn() }));
jest.mock('services/calendar/actions', () => ({
  syncCourseSchedule: jest.fn(async () => undefined),
  allowAssignmentSync: jest.fn(async () => undefined),
  allowCourseCalendarSync: jest.fn(async () => undefined),
  exportCalendars: jest.fn(async () => undefined),
  deleteCalendars: jest.fn(async () => ({ text: 'Deleted', type: 'success' })),
}));
jest.mock('services/surfaces', () => ({
  refreshSurfaces: jest.fn(async () => {}),
}));

const now = Date.parse('2026-11-10T00:00:00Z');

beforeEach(() => {
  jest.useFakeTimers({ now, doNotFake: ['nextTick', 'setImmediate'] });
  resetSettings();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useCourseScheduleSync', () => {
  it('asks for access, turns the sync on and waits for the surfaces to write', async () => {
    const { result } = await renderHook(() => useCourseScheduleSync());
    let written = false;
    jest.mocked(refreshSurfaces).mockImplementationOnce(async () => {
      // The setting is on before the surfaces run.
      written = getSettings().courseCalendarSync;
    });
    jest
      .mocked(allowCourseCalendarSync)
      .mockResolvedValueOnce({ text: 'Denied', type: 'error' });
    await act(() => result.current.setSyncEnabled(true));
    expect(written).toBe(true);
    expect(result.current.enabling).toBe(false);
    expect(toast).toHaveBeenCalledWith('Denied', 'error');
    expect(getSettings().courseCalendarSync).toBe(true);

    await act(() => result.current.setSyncEnabled(false));
    expect(getSettings().courseCalendarSync).toBe(false);
    expect(allowCourseCalendarSync).toHaveBeenCalledTimes(1);
  });

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
  it('asks for access, turns the sync on and waits for the surfaces to write', async () => {
    let written = false;
    jest.mocked(refreshSurfaces).mockImplementationOnce(async () => {
      // The setting is on before the surfaces run.
      written = getSettings().assignmentCalendarSync;
    });
    const { result } = await renderHook(() => useAssignmentSync());
    await act(() => result.current.setSyncEnabled('calendar', true));
    expect(allowAssignmentSync).toHaveBeenCalledWith('calendar');
    expect(written).toBe(true);
    expect(toast).not.toHaveBeenCalled();
    expect(result.current.calendarSyncing).toBe(false);
  });

  it('only saves the setting when turned off', async () => {
    const { result } = await renderHook(() => useAssignmentSync());
    await act(() => result.current.setSyncEnabled('reminder', true));
    await act(() => result.current.setSyncEnabled('reminder', false));
    expect(allowAssignmentSync).toHaveBeenCalledTimes(1);
    expect(refreshSurfaces).toHaveBeenCalledTimes(1);
    expect(getSettings().assignmentReminderSync).toBe(false);
  });

  it('says when access is denied and keeps the sync on', async () => {
    jest
      .mocked(allowAssignmentSync)
      .mockResolvedValueOnce({ text: 'No permission', type: 'error' });
    const { result } = await renderHook(() => useAssignmentSync());
    await act(() => result.current.setSyncEnabled('reminder', true));
    expect(toast).toHaveBeenCalledWith('No permission', 'error');
    expect(getSettings().assignmentReminderSync).toBe(true);
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
