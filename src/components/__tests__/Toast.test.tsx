import { AccessibilityInfo, ToastAndroid } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { Toast, toast } from 'components/Toast';
import { toast as androidToast } from 'components/Toast.android';

// How long a toast takes to animate away once its time is up.
const exitDuration = 300;

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(async () => {
  await act(() => toast('', 'none'));
  jest.useRealTimers();
});

describe('Toast (iOS)', () => {
  it('shows nothing until a toast is sent', async () => {
    await render(<Toast />);
    expect(screen.queryAllByText(/.+/)).toHaveLength(0);
  });

  it('shows the text and hides it after the type’s duration', async () => {
    await render(<Toast />);
    await act(() => toast('Saved', 'success'));
    expect(screen.getByText('Saved')).toBeTruthy();

    await act(() => jest.advanceTimersByTime(2999));
    expect(screen.getByText('Saved')).toBeTruthy();
    await act(() => jest.advanceTimersByTime(1 + exitDuration));
    expect(screen.queryByText('Saved')).toBeNull();
  });

  it('keeps errors up longer and honors a custom duration', async () => {
    await render(<Toast />);
    await act(() => toast('Failed', 'error'));
    await act(() => jest.advanceTimersByTime(4999));
    expect(screen.getByText('Failed')).toBeTruthy();
    await act(() => jest.advanceTimersByTime(1 + exitDuration));
    expect(screen.queryByText('Failed')).toBeNull();

    await act(() => toast('Quick', 'error', 1000));
    await act(() => jest.advanceTimersByTime(1000 + exitDuration));
    expect(screen.queryByText('Quick')).toBeNull();
  });

  it('replaces the current toast and restarts the timer', async () => {
    await render(<Toast />);
    await act(() => toast('First', 'success'));
    await act(() => jest.advanceTimersByTime(2000));
    await act(() => toast('Second', 'success'));
    expect(screen.queryByText('First')).toBeNull();
    await act(() => jest.advanceTimersByTime(2000));
    expect(screen.getByText('Second')).toBeTruthy();
    await act(() => jest.advanceTimersByTime(1000 + exitDuration));
    expect(screen.queryByText('Second')).toBeNull();
  });

  it('dismisses on tap', async () => {
    await render(<Toast />);
    await act(() => toast('Saved', 'success'));
    const view = screen.getByRole('alert');
    await fireEvent(view, 'responderGrant', touch());
    await fireEvent(view, 'responderRelease', touch());
    await act(() => jest.advanceTimersByTime(exitDuration));
    expect(screen.queryByText('Saved')).toBeNull();
  });

  it('shows the symbol for the type and none for plain toasts', async () => {
    await render(<Toast />);
    await act(() => toast('Saved', 'success'));
    expect(screen.getByTestId('icon-checkmark.circle.fill')).toBeTruthy();
    await act(() => toast('Careful', 'warning'));
    expect(
      screen.getByTestId('icon-exclamationmark.triangle.fill'),
    ).toBeTruthy();
    await act(() => toast('Failed', 'error'));
    expect(screen.getByTestId('icon-xmark.circle.fill')).toBeTruthy();
    await act(() => toast('Note', 'none'));
    expect(screen.queryAllByTestId(/^icon-/)).toHaveLength(0);
  });

  it('announces the text to VoiceOver', () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    toast('Saved', 'success');
    expect(announce).toHaveBeenCalledWith('Saved');
  });

  it('plays the haptic that matches the type', async () => {
    toast('Saved', 'success');
    toast('Careful', 'warning');
    toast('Failed', 'error');
    toast('Note', 'none');
    toast('', 'error');
    expect((Haptics.notificationAsync as jest.Mock).mock.calls).toEqual([
      [Haptics.NotificationFeedbackType.Success],
      [Haptics.NotificationFeedbackType.Warning],
      [Haptics.NotificationFeedbackType.Error],
    ]);
  });
});

describe('Toast (Android)', () => {
  it('shows the system toast, long for errors and long durations', () => {
    const show = jest.spyOn(ToastAndroid, 'show').mockImplementation();
    androidToast('Saved', 'success');
    androidToast('Failed', 'error');
    androidToast('Logging in', 'none', 1000);
    androidToast('Shared', 'success', 5000);
    androidToast('', 'error');
    expect(show.mock.calls).toEqual([
      ['Saved', ToastAndroid.SHORT],
      ['Failed', ToastAndroid.LONG],
      ['Logging in', ToastAndroid.SHORT],
      ['Shared', ToastAndroid.LONG],
    ]);
    expect((Haptics.notificationAsync as jest.Mock).mock.calls).toEqual([
      [Haptics.NotificationFeedbackType.Success],
      [Haptics.NotificationFeedbackType.Error],
      [Haptics.NotificationFeedbackType.Success],
    ]);
  });
});

const touch = () => ({
  touchHistory: {
    numberActiveTouches: 0,
    indexOfSingleActiveTouch: 0,
    mostRecentTimeStamp: 0,
    touchBank: [],
  },
  nativeEvent: { touches: [], changedTouches: [], timestamp: 0 },
});
