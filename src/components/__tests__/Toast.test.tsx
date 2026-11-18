import {
  AccessibilityInfo,
  Keyboard,
  StyleSheet,
  ToastAndroid,
} from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import DeviceInfo from 'constants/DeviceInfo';
import { textStyles } from 'components/Text';
import { Toast, toast } from 'components/Toast';
import { toast as androidToast } from 'components/Toast.android';
import { tabBarFrame } from 'modules/toast';
import { WindowProvider } from 'hooks/useWindow';
import { registerWindow } from 'services/windows';
import { Windows } from 'test-utils/mocks/windows';

// How long a toast takes to animate away once its time is up.
const exitDuration = 300;

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(async () => {
  await act(() => toast('', 'none'));
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

  it('shows only in the window the person is using', async () => {
    const unregister = registerWindow('b');
    await render(
      <WindowProvider windowId="a">
        <Toast />
      </WindowProvider>,
    );
    Windows.targetWindowId.mockReturnValue('b');
    await act(() => toast('Elsewhere', 'success'));
    expect(screen.queryByText('Elsewhere')).toBeNull();

    Windows.targetWindowId.mockReturnValue('a');
    await act(() => toast('Here', 'success'));
    expect(screen.getByText('Here')).toBeTruthy();
    expect(tabBarFrame).toHaveBeenLastCalledWith('a');
    Windows.targetWindowId.mockReturnValue(null);
    unregister();
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
    expect(padding()).toBe(16);
    await act(() =>
      listeners.keyboardWillShow({ endCoordinates: { height: 300 } }),
    );
    expect(padding()).toBe(316);
    await act(() => listeners.keyboardWillHide({}));
    expect(padding()).toBe(16);
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
    expect(padding()).toBe(16);
  });

  describe('placement', () => {
    afterEach(() => {
      (tabBarFrame as jest.Mock).mockImplementation(() =>
        Promise.resolve(null),
      );
    });

    const window = { windowWidth: 402, windowHeight: 874 };
    const margins = () => {
      const style = StyleSheet.flatten(
        screen.getByRole('alert').parent!.props.style,
      );
      return {
        bottom: style.paddingBottom,
        left: style.paddingLeft,
        right: style.paddingRight,
      };
    };
    const show = async (bar: Parameters<typeof frame>[0]) => {
      frame(bar);
      await render(<Toast />);
      await act(() => toast('Saved', 'success'));
    };
    const frame = (
      bar: { x: number; y: number; width: number; height: number } | null,
    ) =>
      (tabBarFrame as jest.Mock).mockResolvedValue(
        bar && { ...bar, ...window },
      );

    it('sits a gap above a tab bar along the bottom', async () => {
      await show({ x: 0, y: 791, width: 402, height: 83 });
      expect(margins()).toEqual({ bottom: 83 + 16, left: 16, right: 16 });
    });

    it('keeps clear of a tab bar along a side', async () => {
      await show({ x: 330, y: 0, width: 72, height: 874 });
      expect(margins()).toEqual({ bottom: 16, left: 16, right: 72 + 16 });

      await act(() => toast('', 'none'));
      await show({ x: 0, y: 0, width: 72, height: 874 });
      expect(margins()).toEqual({ bottom: 16, left: 72 + 16, right: 16 });
    });

    it('sits at the bottom with no tab bar, or one at the top', async () => {
      await show({ x: 0, y: 24, width: 402, height: 50 });
      expect(margins().bottom).toBe(16);

      await act(() => toast('', 'none'));
      await show(null);
      expect(margins().bottom).toBe(16);
    });

    it('floats as far from the edges as the tab bar does with Liquid Glass', async () => {
      jest.spyOn(DeviceInfo, 'hasLiquidGlass').mockReturnValue(true);
      await show(null);
      expect(margins()).toEqual({ bottom: 21, left: 21, right: 21 });
    });

    it('waits for the tab bar before it shows, and takes none if asking fails', async () => {
      let fail: (error: Error) => void = () => {};
      (tabBarFrame as jest.Mock).mockReturnValue(
        new Promise((_, reject) => {
          fail = reject;
        }),
      );
      await render(<Toast />);
      await act(() => toast('Saved', 'success'));
      expect(screen.queryByText('Saved')).toBeNull();
      await act(() => fail(new Error('No window')));
      expect(margins().bottom).toBe(16);
    });

    it('ignores an answer that comes after the toast is gone', async () => {
      let answer: (value: null) => void = () => {};
      (tabBarFrame as jest.Mock).mockReturnValue(
        new Promise(resolve => {
          answer = resolve;
        }),
      );
      await render(<Toast />);
      await act(() => toast('Saved', 'success'));
      await act(() => toast('', 'none'));
      await act(() => answer(null));
      expect(screen.queryByText('Saved')).toBeNull();
    });
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

  it('draws a smaller pill around Body text on the Mac', async () => {
    const style = () => ({
      text: StyleSheet.flatten(screen.getByText('Saved').props.style),
      hud: StyleSheet.flatten(screen.getByTestId('toast-hud').props.style),
    });
    await render(<Toast />);
    await act(() => toast('Saved', 'success'));
    expect(style().text.fontSize).toBe(textStyles.subheadline.fontSize);
    expect(style().hud.minHeight).toBe(50);

    jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
    await act(() => toast('Saved', 'success'));
    expect(style().text.fontSize).toBe(textStyles.body.fontSize);
    expect(style().text.fontWeight).toBe('600');
    expect(style().hud.minHeight).toBe(40);
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
