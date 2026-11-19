import { DeviceEventEmitter } from 'react-native';
import { Windows } from 'modules/windows';
import {
  canOpenWindows,
  followMacActivation,
  isTargetWindow,
  openWindow,
  registerWindow,
  setWindowLink,
  setWindowTitle,
  targetWindow,
} from 'services/windows';

const unregister: (() => void)[] = [];
const open = (id: string) => unregister.push(registerWindow(id));

afterEach(() => {
  unregister.splice(0).forEach(remove => remove());
  jest.mocked(Windows!.targetWindowId).mockReturnValue(null);
  jest.mocked(Windows!.supportsMultipleWindows).mockReturnValue(false);
});

describe('windows', () => {
  it('treats the app as one window when roots have no id', () => {
    expect(targetWindow()).toBeUndefined();
    expect(isTargetWindow(undefined)).toBe(true);
  });

  it("targets the key window when it's one of the app's roots", () => {
    open('a');
    open('b');
    jest.mocked(Windows!.targetWindowId).mockReturnValue('b');
    expect(targetWindow()).toBe('b');
    expect(isTargetWindow('a')).toBe(false);
    expect(isTargetWindow('b')).toBe(true);
  });

  it('falls back to the oldest window when UIKit names none of them', () => {
    open('a');
    open('b');
    jest.mocked(Windows!.targetWindowId).mockReturnValue('closed');
    expect(targetWindow()).toBe('a');
    jest.mocked(Windows!.targetWindowId).mockReturnValue(null);
    expect(targetWindow()).toBe('a');
  });

  it('forgets a window once its root unmounts', () => {
    open('a');
    const removeB = registerWindow('b');
    jest.mocked(Windows!.targetWindowId).mockReturnValue('b');
    removeB();
    expect(targetWindow()).toBe('a');
  });

  it('passes opening and restoring windows to the native module', () => {
    jest.mocked(Windows!.supportsMultipleWindows).mockReturnValue(true);
    expect(canOpenWindows()).toBe(true);
    openWindow('learnx://notice/n1');
    expect(Windows!.openWindow).toHaveBeenCalledWith('learnx://notice/n1');
    setWindowLink('a', 'learnx://today');
    expect(Windows!.setWindowLink).toHaveBeenCalledWith('a', 'learnx://today');
    setWindowTitle('a', 'Today');
    expect(Windows!.setWindowTitle).toHaveBeenCalledWith('a', 'Today');
  });

  it("keeps a window's place when its root registers again", () => {
    open('a');
    open('b');
    open('a');
    expect(targetWindow()).toBe('a');
  });

  it('ignores a window that fails to be named', async () => {
    jest.mocked(Windows!.setWindowTitle).mockRejectedValueOnce(new Error('no'));
    setWindowTitle('a', 'Today');
    await Promise.resolve();
    expect(Windows!.setWindowTitle).toHaveBeenCalledTimes(1);
  });

  it('ignores a window that fails to open', async () => {
    jest.mocked(Windows!.openWindow).mockRejectedValueOnce(new Error('no'));
    openWindow('learnx://notice/n1');
    await Promise.resolve();
    expect(Windows!.openWindow).toHaveBeenCalledTimes(1);
  });
});

describe('followMacActivation', () => {
  it("sends the Mac app leaving the front and coming back as React Native's app state event", () => {
    // AppState listens for it on the device event emitter.
    const emit = jest.spyOn(DeviceEventEmitter, 'emit');
    const remove = jest.fn();
    jest.mocked(Windows!.addListener).mockReturnValueOnce({ remove } as never);
    const stop = followMacActivation();
    const changed = jest.mocked(Windows!.addListener).mock
      .calls[0][1] as (event: { active: boolean }) => void;

    changed({ active: false });
    changed({ active: true });
    expect(emit.mock.calls).toEqual([
      ['appStateDidChange', { app_state: 'inactive' }],
      ['appStateDidChange', { app_state: 'active' }],
    ]);

    stop();
    expect(remove).toHaveBeenCalled();
  });
});
