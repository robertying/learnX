import { act, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { Toast, toast } from 'components/Toast';

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(async () => {
  await act(() => toast('', 'none'));
  jest.useRealTimers();
});

describe('Toast', () => {
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
    await act(() => jest.advanceTimersByTime(1));
    expect(screen.queryByText('Saved')).toBeNull();
  });

  it('keeps errors up longer and honors a custom duration', async () => {
    await render(<Toast />);
    await act(() => toast('Failed', 'error'));
    await act(() => jest.advanceTimersByTime(4999));
    expect(screen.getByText('Failed')).toBeTruthy();
    await act(() => jest.advanceTimersByTime(1));
    expect(screen.queryByText('Failed')).toBeNull();

    await act(() => toast('Quick', 'error', 1000));
    await act(() => jest.advanceTimersByTime(1000));
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
    await act(() => jest.advanceTimersByTime(1000));
    expect(screen.queryByText('Second')).toBeNull();
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
