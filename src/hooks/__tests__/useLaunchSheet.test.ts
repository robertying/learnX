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

  it("shows What's New after an update, not the set-up page", () => {
    expect(pickLaunchSheet({ ...base, setupSeen: false })).toBe('WhatsNew');
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
  });

  it('opens the set-up page a moment after the first login', async () => {
    noteLoginShown();
    const hook = await renderHook(() => useLaunchSheet());
    jest.advanceTimersByTime(999);
    expect(mockNavigate).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(mockNavigate).toHaveBeenCalledWith('Setup');
    expect(useAppStateStore.getState().setupSeen).toBe(false);
    await hook.unmount();
  });

  it("marks set-up seen after an update and shows What's New", async () => {
    jest
      .mocked(whatsNewSince)
      .mockReturnValueOnce({ version: '19.0.0', highlights: [] });
    await launch();
    expect(useAppStateStore.getState().setupSeen).toBe(true);
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
