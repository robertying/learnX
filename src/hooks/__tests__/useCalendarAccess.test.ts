import { AppState, Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import { act, renderHook } from '@testing-library/react-native';
import { getAndRequestPermission } from 'helpers/event';
import useCalendarAccess from 'hooks/useCalendarAccess';

jest.mock('helpers/event', () => ({
  getAndRequestPermission: jest.fn(async () => true),
}));

const response = (status: string, canAskAgain = true) =>
  ({ status, canAskAgain, granted: status === 'granted' }) as never;

const os = Platform.OS;
afterEach(() => {
  Platform.OS = os;
});

beforeEach(() => {
  jest
    .mocked(Calendar.getCalendarPermissions)
    .mockResolvedValue(response('granted'));
  jest
    .mocked(Calendar.getRemindersPermissions)
    .mockResolvedValue(response('denied', false));
});

it('reads calendar and Reminders access', async () => {
  Platform.OS = 'ios';
  const { result } = await renderHook(() => useCalendarAccess());
  await act(async () => {});
  expect(result.current.calendar).toBe('granted');
  expect(result.current.reminders).toBe('denied');
});

it("leaves Reminders unknown on Android, and can ask again when it's allowed", async () => {
  Platform.OS = 'android';
  jest
    .mocked(Calendar.getCalendarPermissions)
    .mockResolvedValue(response('denied', true));
  const { result } = await renderHook(() => useCalendarAccess());
  await act(async () => {});
  expect(result.current.calendar).toBe('undetermined');
  expect(result.current.reminders).toBeNull();
});

it('asks, then checks again', async () => {
  const { result } = await renderHook(() => useCalendarAccess());
  await act(async () => {});
  jest
    .mocked(Calendar.getCalendarPermissions)
    .mockResolvedValue(response('denied', false));
  await act(() => result.current.request('calendar'));
  expect(getAndRequestPermission).toHaveBeenCalledWith('calendar');
  expect(result.current.calendar).toBe('denied');
});

it('checks again when the app comes back', async () => {
  const listener = jest.spyOn(AppState, 'addEventListener');
  const { result, unmount } = await renderHook(() => useCalendarAccess());
  await act(async () => {});
  jest
    .mocked(Calendar.getCalendarPermissions)
    .mockResolvedValue(response('denied', false));
  const onChange = listener.mock.calls.at(-1)![1] as (state: string) => void;
  await act(async () => onChange('active'));
  expect(result.current.calendar).toBe('denied');
  await unmount();
});
