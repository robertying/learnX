import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { latestReleaseQuery } from 'data/latestRelease';
import { resetNotified } from 'data/notified';
import { clearQueryCache, queryClient } from 'data/queryClient';
import { getLatestRelease } from 'helpers/update';
import Updater from 'modules/updater';
import { checkForUpdate, watchUpdates } from 'services/updateNotifications';

// Loads expo-updates and the Crashlytics module, neither of which Jest can.
jest.mock('services/crashReporting', () => ({ recordError: jest.fn() }));

jest.mock('helpers/update', () => ({
  ...jest.requireActual('helpers/update'),
  getLatestRelease: jest.fn(),
}));
// The APKs: the build that updates itself.
jest.mock('modules/updater', () => ({
  __esModule: true,
  default: { isSupported: true },
}));
jest.mock('expo-application', () => ({
  nativeApplicationVersion: '19.0.0',
  nativeBuildVersion: '1',
}));

const schedule = jest.mocked(Notifications.scheduleNotificationAsync);
const latest = (version: string) =>
  jest
    .mocked(getLatestRelease)
    .mockResolvedValue({ version, url: 'https://mirror/app.apk' });

beforeEach(() => {
  clearQueryCache();
  resetNotified();
});

describe('checkForUpdate', () => {
  it('says a newer release is out', async () => {
    latest('19.1.0');
    await checkForUpdate();
    expect(schedule).toHaveBeenCalledTimes(1);
  });

  it('says nothing about the installed version or an older one', async () => {
    latest('19.0.0');
    await checkForUpdate();
    clearQueryCache();
    latest('18.9.0');
    await checkForUpdate();
    expect(schedule).not.toHaveBeenCalled();
  });

  it('checks the mirror at most every few hours', async () => {
    latest('19.0.0');
    await checkForUpdate();
    await checkForUpdate();
    expect(getLatestRelease).toHaveBeenCalledTimes(1);
  });

  it('gives up quietly when the mirror is out of reach', async () => {
    jest.mocked(getLatestRelease).mockRejectedValue(new Error('Offline'));
    await expect(checkForUpdate()).resolves.toBeUndefined();
  });

  it("doesn't check in builds the stores update", async () => {
    jest.replaceProperty(jest.mocked(Updater!), 'isSupported', false);
    await checkForUpdate();
    expect(getLatestRelease).not.toHaveBeenCalled();
  });
});

describe('watchUpdates', () => {
  it("says what the app's own checks find, and checks on coming back", async () => {
    const addListener = jest.spyOn(AppState, 'addEventListener');
    watchUpdates();
    watchUpdates();
    expect(addListener).toHaveBeenCalledTimes(1);

    latest('19.1.0');
    await queryClient.fetchQuery(latestReleaseQuery);
    await new Promise(setImmediate);
    expect(schedule).toHaveBeenCalledTimes(1);

    // Coming back once the last check is old checks again.
    jest.mocked(getLatestRelease).mockClear();
    await queryClient.invalidateQueries({
      queryKey: latestReleaseQuery.queryKey,
      refetchType: 'none',
    });
    const onChange = addListener.mock.calls[0][1];
    onChange('active');
    await new Promise(setImmediate);
    expect(getLatestRelease).toHaveBeenCalledTimes(1);
  });
});
