import { pickLaunchSheet } from 'hooks/useLaunchSheet';
import {
  resetAppState,
  setWhatsNewSeen,
  useAppStateStore,
} from 'data/appState';

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
