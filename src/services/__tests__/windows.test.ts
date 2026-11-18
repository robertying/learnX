import { Windows } from 'modules/windows';
import {
  canOpenWindows,
  isTargetWindow,
  openWindow,
  registerWindow,
  setWindowLink,
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
  });

  it("keeps a window's place when its root registers again", () => {
    open('a');
    open('b');
    open('a');
    expect(targetWindow()).toBe('a');
  });

  it('ignores a window that fails to open', async () => {
    jest.mocked(Windows!.openWindow).mockRejectedValueOnce(new Error('no'));
    openWindow('learnx://notice/n1');
    await Promise.resolve();
    expect(Windows!.openWindow).toHaveBeenCalledTimes(1);
  });
});
