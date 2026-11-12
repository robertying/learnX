import { AppState } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import {
  canScheduleExactAlarms,
  getNotificationPermission,
  requestExactAlarms,
  requestNotificationPermission,
} from 'services/notifications';
import useNotificationPermission from 'hooks/useNotificationPermission';

jest.mock('services/notifications', () => ({
  getNotificationPermission: jest.fn(async () => 'undetermined'),
  canScheduleExactAlarms: jest.fn(async () => false),
  requestNotificationPermission: jest.fn(async () => 'granted'),
  requestExactAlarms: jest.fn(async () => true),
}));

const addListener = jest.spyOn(AppState, 'addEventListener');

const render = async () => {
  const hook = await renderHook(() => useNotificationPermission());
  await act(async () => {});
  return hook;
};

it('checks both permissions on mount', async () => {
  const { result } = await render();
  expect(result.current.permission).toBe('undetermined');
  expect(result.current.exactAlarms).toBe(false);
});

it('checks again when the app comes back from the system settings', async () => {
  const { result } = await render();
  jest.mocked(getNotificationPermission).mockResolvedValue('granted');
  jest.mocked(canScheduleExactAlarms).mockResolvedValue(true);
  const listener = addListener.mock.calls[0][1];

  await act(async () => listener('background'));
  expect(result.current.permission).toBe('undetermined');

  await act(async () => listener('active'));
  expect(result.current.permission).toBe('granted');
  expect(result.current.exactAlarms).toBe(true);
  jest.mocked(getNotificationPermission).mockResolvedValue('undetermined');
  jest.mocked(canScheduleExactAlarms).mockResolvedValue(false);
});

it('asks only when not granted yet', async () => {
  const { result } = await render();
  let granted = false;
  await act(async () => {
    granted = await result.current.request();
  });
  expect(granted).toBe(true);
  expect(result.current.permission).toBe('granted');

  await act(async () => {
    granted = await result.current.request();
  });
  expect(requestNotificationPermission).toHaveBeenCalledTimes(1);
});

it('reports a denied request', async () => {
  jest.mocked(requestNotificationPermission).mockResolvedValueOnce('denied');
  const { result } = await render();
  let granted = true;
  await act(async () => {
    granted = await result.current.request();
  });
  expect(granted).toBe(false);
  expect(result.current.permission).toBe('denied');
});

it('updates exact alarms after the system page', async () => {
  const { result } = await render();
  await act(() => result.current.requestExact());
  expect(requestExactAlarms).toHaveBeenCalled();
  expect(result.current.exactAlarms).toBe(true);
});

it('keeps unknown when a check fails', async () => {
  jest
    .mocked(getNotificationPermission)
    .mockRejectedValueOnce(new Error('no module'));
  const { result } = await render();
  expect(result.current.permission).toBeNull();
});
