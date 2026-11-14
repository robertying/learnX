import { AppState } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import * as Updates from 'expo-updates';
import useOtaUpdate, { OTA_AWAY_MS } from 'hooks/useOtaUpdate';

beforeEach(() => {
  jest.useFakeTimers();
  jest.replaceProperty(Updates, 'isEnabled', true);
});

afterEach(() => {
  jest.useRealTimers();
});

const pending = (isUpdatePending: boolean) =>
  jest
    .mocked(Updates.useUpdates)
    .mockReturnValue({ isUpdatePending } as ReturnType<
      typeof Updates.useUpdates
    >);

/** Moves the app to the background and back after `ms`. */
const leaveAndComeBack = async (ms: number) => {
  const onChange = jest
    .mocked(AppState.addEventListener)
    .mock.calls.at(-1)![1] as (state: string) => void;
  await act(() => onChange('inactive'));
  await act(() => onChange('background'));
  await act(() => jest.advanceTimersByTime(ms));
  await act(() => onChange('active'));
};

describe('useOtaUpdate', () => {
  it('checks for an update after an hour in the background', async () => {
    pending(false);
    jest
      .mocked(Updates.checkForUpdateAsync)
      .mockResolvedValueOnce({ isAvailable: true } as Awaited<
        ReturnType<typeof Updates.checkForUpdateAsync>
      >);
    await renderHook(useOtaUpdate);

    await leaveAndComeBack(OTA_AWAY_MS);

    expect(Updates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
    expect(Updates.fetchUpdateAsync).toHaveBeenCalledTimes(1);
    expect(Updates.reloadAsync).not.toHaveBeenCalled();
  });

  it('does nothing after a short break', async () => {
    pending(true);
    await renderHook(useOtaUpdate);

    await leaveAndComeBack(OTA_AWAY_MS - 1000);

    expect(Updates.checkForUpdateAsync).not.toHaveBeenCalled();
    expect(Updates.reloadAsync).not.toHaveBeenCalled();
  });

  it('starts a downloaded update after an hour in the background', async () => {
    pending(true);
    await renderHook(useOtaUpdate);

    await leaveAndComeBack(OTA_AWAY_MS);

    expect(Updates.reloadAsync).toHaveBeenCalledTimes(1);
    expect(Updates.checkForUpdateAsync).not.toHaveBeenCalled();
  });

  it('keeps running when the server cannot be reached', async () => {
    pending(false);
    jest
      .mocked(Updates.checkForUpdateAsync)
      .mockRejectedValueOnce(new Error('offline'));
    await renderHook(useOtaUpdate);

    await leaveAndComeBack(OTA_AWAY_MS);

    expect(Updates.fetchUpdateAsync).not.toHaveBeenCalled();
  });

  it('does nothing when updates are off (debug builds)', async () => {
    jest.replaceProperty(Updates, 'isEnabled', false);
    await renderHook(useOtaUpdate);

    expect(AppState.addEventListener).not.toHaveBeenCalled();
  });
});
