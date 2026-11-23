import { AppState } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import {
  canScheduleExactAlarms,
  getBackgroundRefreshState,
  getNotificationPermission,
  onPermissionAnswered,
  requestExactAlarms,
  requestNotificationPermission,
} from 'services/notifications';
import useNotificationPermission from 'hooks/useNotificationPermission';

jest.mock('services/notifications', () => ({
  getNotificationPermission: jest.fn(async () => 'undetermined'),
  canScheduleExactAlarms: jest.fn(async () => false),
  getBackgroundRefreshState: jest.fn(async () => 'off'),
  requestNotificationPermission: jest.fn(async () => 'granted'),
  requestExactAlarms: jest.fn(async () => true),
  onPermissionAnswered: jest.fn(() => () => {}),
}));

const addListener = jest.spyOn(AppState, 'addEventListener');

const render = async () => {
  const hook = await renderHook(() => useNotificationPermission());
  await act(async () => {});
  return hook;
};

it('checks the permissions and background refresh on mount', async () => {
  const { result } = await render();
  expect(result.current.permission).toBe('undetermined');
  expect(result.current.exactAlarms).toBe(false);
  expect(result.current.backgroundRefresh).toBe('off');
});

it('checks again when the app comes back from the system settings', async () => {
  const { result } = await render();
  jest.mocked(getNotificationPermission).mockResolvedValue('granted');
  jest.mocked(canScheduleExactAlarms).mockResolvedValue(true);
  jest.mocked(getBackgroundRefreshState).mockResolvedValue('on');
  const listener = addListener.mock.calls[0][1];

  await act(async () => listener('background'));
  expect(result.current.permission).toBe('undetermined');

  await act(async () => listener('active'));
  expect(result.current.permission).toBe('granted');
  expect(result.current.exactAlarms).toBe(true);
  expect(result.current.backgroundRefresh).toBe('on');
  jest.mocked(getNotificationPermission).mockResolvedValue('undetermined');
  jest.mocked(canScheduleExactAlarms).mockResolvedValue(false);
  jest.mocked(getBackgroundRefreshState).mockResolvedValue('off');
});

it('checks again after the permission is asked for elsewhere, until unmounted', async () => {
  const stop = jest.fn();
  jest.mocked(onPermissionAnswered).mockReturnValueOnce(stop);
  const { result, unmount } = await render();
  jest.mocked(getNotificationPermission).mockResolvedValueOnce('granted');
  const answered = jest.mocked(onPermissionAnswered).mock.calls[0][0];
  await act(async () => answered());
  expect(result.current.permission).toBe('granted');
  await unmount();
  expect(stop).toHaveBeenCalled();
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
