import {
  AccessibilityInfo,
  Keyboard,
  StyleSheet,
  ToastAndroid,
} from 'react-native';
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

    await act(() => toast('Quick', 'error', { duration: 1000 }));
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

  /** Drags the toast `dy` points down (up when negative) over 100 ms. */
  const drag = async (dy: number, release = true) => {
    const view = screen.getByRole('alert');
    await fireEvent(view, 'responderGrant', touchAt(0, 1));
    await fireEvent(view, 'responderMove', touchAt(dy, 101));
    await fireEvent(
      view,
      release ? 'responderRelease' : 'responderTerminate',
      touchAt(dy, 101),
    );
    await act(() => jest.advanceTimersByTime(exitDuration));
  };

  it('dismisses on a swipe down, and springs back from a short or upward one', async () => {
    await render(<Toast />);
    await act(() => toast('Saved', 'success'));
    await drag(-40);
    await drag(10);
    await drag(40, false);
    expect(screen.getByText('Saved')).toBeTruthy();
    await drag(40);
    expect(screen.queryByText('Saved')).toBeNull();
  });

  it('sits above the keyboard while it is up', async () => {
    const listeners: Record<string, (e: unknown) => void> = {};
    const remove = jest.fn();
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((
      name: string,
      listener: (e: unknown) => void,
    ) => {
      listeners[name] = listener;
      return { remove };
    }) as never);
    await render(<Toast />);
    await act(() => toast('Saved', 'success'));
    const padding = () =>
      StyleSheet.flatten(screen.getByRole('alert').parent!.props.style)
        .paddingBottom;
    expect(padding()).toBe(64);
    await act(() =>
      listeners.keyboardWillShow({ endCoordinates: { height: 300 } }),
    );
    expect(padding()).toBe(316);
    await act(() => listeners.keyboardWillHide({}));
    expect(padding()).toBe(64);
    await screen.unmount();
    expect(remove).toHaveBeenCalledTimes(2);
  });

  it('starts above a keyboard already up', async () => {
    jest.spyOn(Keyboard, 'isVisible').mockReturnValue(true);
    const metrics = jest
      .spyOn(Keyboard, 'metrics')
      .mockReturnValue({ height: 200, width: 400, screenX: 0, screenY: 600 });
    await render(<Toast />);
    await act(() => toast('Saved', 'success'));
    const padding = () =>
      StyleSheet.flatten(screen.getByRole('alert').parent!.props.style)
        .paddingBottom;
    expect(padding()).toBe(216);

    // Up, but not measured yet
    metrics.mockReturnValue(undefined);
    await screen.unmount();
    await render(<Toast />);
    expect(padding()).toBe(64);
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
    toast('Archived', 'success', { haptic: false });
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
    androidToast('Logging in', 'none', { duration: 1000 });
    androidToast('Shared', 'success', { duration: 5000 });
    androidToast('Archived', 'success', { haptic: false });
    androidToast('', 'error');
    expect(show.mock.calls).toEqual([
      ['Saved', ToastAndroid.SHORT],
      ['Failed', ToastAndroid.LONG],
      ['Logging in', ToastAndroid.SHORT],
      ['Shared', ToastAndroid.LONG],
      ['Archived', ToastAndroid.SHORT],
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

/** One finger at `pageY`, at time `timestamp`, as PanResponder tracks it. */
const touchAt = (pageY: number, timestamp: number) => ({
  touchHistory: {
    numberActiveTouches: 1,
    indexOfSingleActiveTouch: 0,
    mostRecentTimeStamp: timestamp,
    touchBank: [
      {
        touchActive: true,
        startPageX: 0,
        startPageY: 0,
        startTimeStamp: 1,
        currentPageX: 0,
        currentPageY: pageY,
        currentTimeStamp: timestamp,
        previousPageX: 0,
        previousPageY: 0,
        previousTimeStamp: 1,
      },
    ],
  },
  nativeEvent: { touches: [], changedTouches: [], timestamp },
});
