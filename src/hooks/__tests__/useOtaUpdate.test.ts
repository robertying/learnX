import { AppState, AppStateStatus } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import * as Updates from 'expo-updates';
import { toast } from 'components/Toast';
import useOtaUpdate, { foregroundCheckInterval } from 'hooks/useOtaUpdate';

jest.mock('components/Toast', () => ({ toast: jest.fn() }));
jest.mock('expo-updates', () => ({
  isEnabled: true,
  useUpdates: jest.fn(),
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
}));

const useUpdates = jest.mocked(Updates.useUpdates);
const checkForUpdate = jest.mocked(Updates.checkForUpdateAsync);
const fetchUpdate = jest.mocked(Updates.fetchUpdateAsync);
const reload = jest.mocked(Updates.reloadAsync);

const updatesState = (pendingId?: string) =>
  ({
    isUpdatePending: !!pendingId,
    downloadedUpdate: pendingId ? { updateId: pendingId } : undefined,
  }) as ReturnType<typeof Updates.useUpdates>;

let appStateListener: (state: AppStateStatus) => void;
let now = Date.now();

beforeEach(() => {
  jest.clearAllMocks();
  useUpdates.mockReturnValue(updatesState());
  reload.mockResolvedValue();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, l) => {
    appStateListener = l;
    return { remove: jest.fn() };
  });
  // lastCheck starts at the module's import time; jump well past it
  now += 10 * foregroundCheckInterval;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
});

const foreground = () => act(() => appStateListener('active'));

describe('useOtaUpdate', () => {
  it('offers a restart once an update is downloaded', async () => {
    const { rerender } = await renderHook(() => useOtaUpdate());
    expect(toast).not.toHaveBeenCalled();

    useUpdates.mockReturnValue(updatesState('u1'));
    await rerender({});
    expect(toast).toHaveBeenCalledTimes(1);
    const action = jest.mocked(toast).mock.calls[0][3];
    expect(action?.label).toBe('Restart');

    action?.onPress();
    expect(reload).toHaveBeenCalled();

    // The same pending update doesn't show the toast again
    await rerender({});
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it('downloads an available update when the app returns to the foreground', async () => {
    checkForUpdate.mockResolvedValue({ isAvailable: true } as never);
    await renderHook(() => useOtaUpdate());

    await foreground();
    expect(checkForUpdate).toHaveBeenCalledTimes(1);
    expect(fetchUpdate).toHaveBeenCalledTimes(1);
  });

  it('checks at most once per interval', async () => {
    checkForUpdate.mockResolvedValue({ isAvailable: false } as never);
    await renderHook(() => useOtaUpdate());

    await foreground();
    now += foregroundCheckInterval - 1;
    await foreground();
    expect(checkForUpdate).toHaveBeenCalledTimes(1);
    expect(fetchUpdate).not.toHaveBeenCalled();

    now += 1;
    await foreground();
    expect(checkForUpdate).toHaveBeenCalledTimes(2);
  });

  it('ignores a failed check', async () => {
    checkForUpdate.mockRejectedValue(new Error('offline'));
    await renderHook(() => useOtaUpdate());

    await foreground();
    expect(fetchUpdate).not.toHaveBeenCalled();
  });
});
