import { renderHook } from '@testing-library/react-native';
import useLaunchSheet, {
  noteLoginShown,
  noteOpenedFromOutside,
  pickLaunchSheet,
  resetLaunchNotes,
} from 'hooks/useLaunchSheet';
import { whatsNewSince } from 'helpers/whatsNew';
import {
  resetAppState,
  setWhatsNewSeen,
  useAppStateStore,
} from 'data/appState';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
let mockSplitLaidOut = true;
jest.mock('navigation/NativeSplitView', () => ({
  useSplitLaidOut: () => mockSplitLaidOut,
}));
jest.mock('navigation/layout', () => ({ nativeSplit: true }));
jest.mock('helpers/whatsNew', () => ({
  whatsNewContext: () => ({}),
  whatsNewSince: jest.fn(() => null),
}));

const base = {
  setupSeen: true,
  loginShown: false,
  openedFromOutside: false,
  hasWhatsNew: true,
};

describe('pickLaunchSheet', () => {
  it('opens the set-up page after the first login', () => {
    expect(
      pickLaunchSheet({ ...base, setupSeen: false, loginShown: true }),
    ).toBe('Setup');
  });

  it('opens the set-up page after an update if it was never seen', () => {
    expect(pickLaunchSheet({ ...base, setupSeen: false })).toBe('Setup');
  });

  it('keeps the set-up page for a launch not opened from outside', () => {
    expect(
      pickLaunchSheet({ ...base, setupSeen: false, openedFromOutside: true }),
    ).toBeNull();
  });

  it('leaves a launch from outside the app alone', () => {
    expect(pickLaunchSheet({ ...base, openedFromOutside: true })).toBeNull();
  });

  it('shows nothing without new highlights', () => {
    expect(pickLaunchSheet({ ...base, hasWhatsNew: false })).toBeNull();
  });
});

describe('setWhatsNewSeen', () => {
  beforeEach(() => useAppStateStore.setState({ whatsNewSeenVersion: null }));

  it('only moves forward', () => {
    setWhatsNewSeen('19.0.0');
    setWhatsNewSeen('18.0.3');
    expect(useAppStateStore.getState().whatsNewSeenVersion).toBe('19.0.0');
    setWhatsNewSeen('19.1.0');
    expect(useAppStateStore.getState().whatsNewSeenVersion).toBe('19.1.0');
  });
});

describe('resetAppState', () => {
  it("keeps what the install has seen and forgets the account's", () => {
    useAppStateStore.setState({
      welcomeSeen: true,
      setupSeen: true,
      whatsNewSeenVersion: '19.0.0',
      courseSharingSeen: true,
    });
    resetAppState();
    expect(useAppStateStore.getState()).toMatchObject({
      welcomeSeen: true,
      setupSeen: false,
      whatsNewSeenVersion: '19.0.0',
      courseSharingSeen: false,
    });
  });
});

describe('useLaunchSheet', () => {
  const launch = async () => {
    const hook = await renderHook(() => useLaunchSheet());
    jest.advanceTimersByTime(1000);
    return hook;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    resetLaunchNotes();
    useAppStateStore.setState({ setupSeen: false, whatsNewSeenVersion: null });
  });
  afterEach(() => {
    jest.useRealTimers();
    mockSplitLaidOut = true;
  });

  it("waits for iOS's tabs to be on screen", async () => {
    mockSplitLaidOut = false;
    noteLoginShown();
    const hook = await renderHook(() => useLaunchSheet());
    jest.advanceTimersByTime(5000);
    expect(mockNavigate).not.toHaveBeenCalled();
    mockSplitLaidOut = true;
    await hook.rerender({});
    jest.advanceTimersByTime(1000);
    expect(mockNavigate).toHaveBeenCalledWith('Setup', undefined);
  });

  it('opens the set-up page a moment after the first login', async () => {
    noteLoginShown();
    const hook = await renderHook(() => useLaunchSheet());
    jest.advanceTimersByTime(999);
    expect(mockNavigate).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(mockNavigate).toHaveBeenCalledWith('Setup', undefined);
    expect(useAppStateStore.getState().setupSeen).toBe(false);
    await hook.unmount();
  });

  it('opens the set-up page after an update if it was never seen', async () => {
    jest
      .mocked(whatsNewSince)
      .mockReturnValueOnce({ version: '19.0.0', highlights: [] });
    await launch();
    expect(mockNavigate).toHaveBeenCalledWith('Setup', { update: true });
  });

  it("shows What's New once set-up was seen", async () => {
    useAppStateStore.setState({ setupSeen: true });
    jest
      .mocked(whatsNewSince)
      .mockReturnValueOnce({ version: '19.0.0', highlights: [] });
    await launch();
    expect(mockNavigate).toHaveBeenCalledWith('WhatsNewStack', {
      screen: 'WhatsNew',
      params: { version: '19.0.0' },
    });
  });

  it('opens nothing over what a tap from outside opened', async () => {
    useAppStateStore.setState({ setupSeen: true });
    jest
      .mocked(whatsNewSince)
      .mockReturnValueOnce({ version: '19.0.0', highlights: [] });
    noteOpenedFromOutside();
    await launch();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('opens nothing when unmounted before the delay', async () => {
    noteLoginShown();
    const hook = await renderHook(() => useLaunchSheet());
    await hook.unmount();
    jest.advanceTimersByTime(1000);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
