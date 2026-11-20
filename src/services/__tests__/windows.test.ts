import { DeviceEventEmitter } from 'react-native';
import { Windows } from 'modules/windows';
import { kvStorage } from 'data/storage';
import {
  RELOAD_LINKS_KEY,
  canOpenWindows,
  followMacActivation,
  forgetWindowLinksForReload,
  isTargetWindow,
  keepWindowLinksForReload,
  openWindow,
  registerWindow,
  setWindowLink,
  setWindowTitle,
  takeReloadLink,
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

describe('window links kept for a reload', () => {
  afterEach(() => forgetWindowLinksForReload());

  it('saves what each open window shows, and drops closed windows', () => {
    open('a');
    const removeB = registerWindow('b');
    setWindowLink('a', 'learnx://today');
    setWindowLink('b', 'learnx://notice/n1');
    removeB();
    keepWindowLinksForReload();
    expect(JSON.parse(kvStorage.getItem(RELOAD_LINKS_KEY) as string)).toEqual({
      a: 'learnx://today',
    });
  });

  it('saves the one window without an id (iPhone, Android)', () => {
    setWindowLink(undefined, 'learnx://assignment/a1');
    expect(Windows!.setWindowLink).not.toHaveBeenCalled();
    keepWindowLinksForReload();
    expect(JSON.parse(kvStorage.getItem(RELOAD_LINKS_KEY) as string)).toEqual(
      expect.objectContaining({ '': 'learnx://assignment/a1' }),
    );
  });

  it('forgets the links when the reload does not start', () => {
    keepWindowLinksForReload();
    forgetWindowLinksForReload();
    expect(kvStorage.getItem(RELOAD_LINKS_KEY)).toBeNull();
  });

  // The first call reads the saved links for the rest of the runtime.
  it('gives each window its link once, and deletes the saved links', () => {
    kvStorage.setItem(
      RELOAD_LINKS_KEY,
      JSON.stringify({ a: 'learnx://today', '': 'learnx://courses' }),
    );
    expect(takeReloadLink('a')).toBe('learnx://today');
    expect(kvStorage.getItem(RELOAD_LINKS_KEY)).toBeNull();
    expect(takeReloadLink('a')).toBeUndefined();
    expect(takeReloadLink(undefined)).toBe('learnx://courses');
    expect(takeReloadLink('b')).toBeUndefined();
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
