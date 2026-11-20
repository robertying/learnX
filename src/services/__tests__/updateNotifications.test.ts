import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { initialAuth, useAuthStore } from 'data/auth';
import { useCredentialsStore } from 'data/credentials';
import { latestReleaseQuery } from 'data/latestRelease';
import { resetNotified } from 'data/notified';
import { clearQueryCache, queryClient } from 'data/queryClient';
import { getLatestRelease } from 'services/updateFeed';
import Updater from 'modules/updater';
import { clearDownloadedUpdate } from 'services/update';
import { checkForUpdate, watchUpdates } from 'services/updateNotifications';

// Loads expo-updates and the Crashlytics module, neither of which Jest can.
jest.mock('services/crashReporting', () => ({ recordError: jest.fn() }));

jest.mock('services/updateFeed', () => ({
  ...jest.requireActual('services/updateFeed'),
  getLatestRelease: jest.fn(),
}));
// The APKs: the build that updates itself.
jest.mock('modules/updater', () => ({
  __esModule: true,
  default: { isSupported: true },
}));
jest.mock('services/update', () => ({ clearDownloadedUpdate: jest.fn() }));
jest.mock('expo-application', () => ({
  nativeApplicationVersion: '19.0.0',
  nativeBuildVersion: '1',
}));

const schedule = jest.mocked(Notifications.scheduleNotificationAsync);
const latest = (version: string) =>
  jest
    .mocked(getLatestRelease)
    .mockResolvedValue({ version, url: 'https://mirror/app.apk' });

const logIn = () =>
  useCredentialsStore.setState({
    credentials: {
      username: 'user',
      password: 'password',
      fingerPrint: 'fp',
      fingerGenPrint: 'fp2',
      fingerGenPrint3: 'fp3',
    },
  });

beforeEach(() => {
  clearQueryCache();
  resetNotified();
  logIn();
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
    // Installing an update ends the app before it deletes the APK.
    expect(clearDownloadedUpdate).toHaveBeenCalledTimes(1);

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

    // Going to the background doesn't check.
    jest.mocked(getLatestRelease).mockClear();
    await queryClient.invalidateQueries({
      queryKey: latestReleaseQuery.queryKey,
      refetchType: 'none',
    });
    onChange('background');
    await new Promise(setImmediate);
    expect(getLatestRelease).not.toHaveBeenCalled();
  });

  it('says what it found before logging in once, after the login', async () => {
    // Watching since the test above.
    useAuthStore.setState(initialAuth);
    useCredentialsStore.setState({ credentials: null });
    latest('19.2.0');
    await queryClient.fetchQuery(latestReleaseQuery);
    await new Promise(setImmediate);
    expect(schedule).not.toHaveBeenCalled();

    // As data/login logs in: the login saved, then the account's data
    // claimed, which forgets what was said and cached, then through.
    logIn();
    await new Promise(setImmediate);
    clearQueryCache();
    resetNotified();
    useAuthStore.setState({ loggedIn: true });
    await new Promise(setImmediate);
    expect(schedule).toHaveBeenCalledTimes(1);

    // The main UI's own check finds the same version.
    await queryClient.fetchQuery({ ...latestReleaseQuery, staleTime: 0 });
    await new Promise(setImmediate);
    expect(schedule).toHaveBeenCalledTimes(1);
  });
});
