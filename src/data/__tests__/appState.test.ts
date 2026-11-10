import {
  resetAppState,
  setChangelogSeen,
  setCourseSharingSeen,
  setSetupSeen,
  setWelcomeSeen,
  setWhatsNewSeen,
  useAppStateStore,
} from 'data/appState';

const state = () => useAppStateStore.getState();

beforeEach(() => {
  useAppStateStore.setState(
    {
      changelogSeenVersion: null,
      courseSharingSeen: false,
      welcomeSeen: false,
      setupSeen: false,
      whatsNewSeenVersion: null,
    },
    true,
  );
});

describe("What's New seen", () => {
  it('moves forward only', () => {
    setWhatsNewSeen('19.0.0');
    expect(state().whatsNewSeenVersion).toBe('19.0.0');
    setWhatsNewSeen('19.1.0');
    expect(state().whatsNewSeenVersion).toBe('19.1.0');
    // A rollback doesn't show 19.1 again later.
    setWhatsNewSeen('19.0.0');
    setWhatsNewSeen('19.1.0');
    expect(state().whatsNewSeenVersion).toBe('19.1.0');
  });
});

describe('resetAppState', () => {
  it("keeps the install's welcome and What's New, forgetting the account's", () => {
    setWelcomeSeen();
    setSetupSeen();
    setCourseSharingSeen();
    setChangelogSeen('19.0.0');
    setWhatsNewSeen('19.0.0');

    resetAppState();

    expect(state()).toEqual({
      changelogSeenVersion: null,
      courseSharingSeen: false,
      welcomeSeen: true,
      setupSeen: false,
      whatsNewSeenVersion: '19.0.0',
    });
  });

  it('leaves a fresh install fresh', () => {
    resetAppState();
    expect(state().welcomeSeen).toBe(false);
    expect(state().whatsNewSeenVersion).toBeNull();
  });
});
