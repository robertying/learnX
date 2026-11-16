import { render } from '@testing-library/react-native';
import Pdf from 'web/packages/Pdf';
import Share from 'web/packages/share';
import * as Notifications from 'web/packages/notifications';
import { Directory, DownloadTask, File, Paths } from 'web/packages/fileSystem';

jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-symbols/androidWeights/regular', () => ({
  __esModule: true,
  default: { name: 'MaterialSymbols_400Regular', font: 1 },
}));

describe('Pdf', () => {
  it('reports that it has no preview', async () => {
    const onError = jest.fn();
    await render(<Pdf onError={onError} />);
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('renders without a handler', async () => {
    await expect(render(<Pdf />)).resolves.toBeDefined();
  });
});

it('has no share sheet', async () => {
  await expect(Share.open()).rejects.toThrow('No share sheet');
});

describe('notifications', () => {
  it('are denied and schedule nothing', async () => {
    expect(await Notifications.getPermissionsAsync()).toMatchObject({
      granted: false,
      status: 'denied',
    });
    expect(await Notifications.requestPermissionsAsync()).toMatchObject({
      granted: false,
    });
    expect(await Notifications.getExactAlarmPermissionsAsync()).toMatchObject({
      granted: false,
    });
    expect(
      await Notifications.requestExactAlarmPermissionsAsync(),
    ).toMatchObject({ granted: false });
    expect(await Notifications.scheduleNotificationAsync()).toBe('');
    expect(await Notifications.getAllScheduledNotificationsAsync()).toEqual([]);
    await Notifications.cancelScheduledNotificationAsync();
    await Notifications.dismissNotificationAsync();
    expect(await Notifications.setNotificationChannelAsync()).toBeNull();
    expect(await Notifications.setNotificationCategoryAsync()).toBeNull();
    expect(await Notifications.registerTaskAsync()).toBeNull();
    Notifications.setNotificationHandler();
  });

  it('were never tapped', () => {
    expect(Notifications.getLastNotificationResponse()).toBeNull();
    expect(Notifications.useLastNotificationResponse()).toBeNull();
    Notifications.clearLastNotificationResponse();
    expect(() =>
      Notifications.addNotificationResponseReceivedListener().remove(),
    ).not.toThrow();
    expect(Notifications.DEFAULT_ACTION_IDENTIFIER).toBe(
      'expo.modules.notifications.actions.DEFAULT',
    );
    expect(Notifications.SchedulableTriggerInputTypes.DATE).toBe('date');
    expect(Notifications.AndroidImportance.HIGH).toBe(6);
    expect(Notifications.IosAuthorizationStatus.DENIED).toBe(1);
  });
});

describe('file system', () => {
  it('joins paths and names entries', () => {
    const dir = new Directory(Paths.cache, 'downloads/');
    expect(dir.uri).toBe('file:///cache/downloads/');
    expect(dir.name).toBe('downloads');
    const file = new File(dir, '/notes.pdf');
    expect(file.uri).toBe('file:///cache/downloads/notes.pdf');
    expect(file.parentDirectory.uri).toBe('file:///cache/downloads');
    expect(Paths.document.uri).toBe('file:///document/');
  });

  it('has nothing in it', () => {
    const dir = new Directory(Paths.cache, 'downloads');
    expect(dir.exists).toBe(false);
    expect(dir.size).toBe(0);
    expect(dir.list()).toEqual([]);
    expect(dir.info()).toEqual({ exists: false, uri: dir.uri });
    expect(() => dir.delete()).not.toThrow();
  });

  it('fails to read or write', async () => {
    const dir = new Directory(Paths.cache, 'a');
    const file = new File(dir, 'b');
    for (const call of [
      () => dir.create(),
      () => dir.copy(),
      () => dir.move(),
      () => dir.createDirectory(),
      () => dir.createFile(),
      () => file.write(),
      () => file.writeSync(),
      () => file.textSync(),
      () => file.open(),
      () => new DownloadTask(),
    ]) {
      expect(call).toThrow('No file system');
    }
    await expect(file.text()).rejects.toThrow('No file system');
    await expect(file.bytes()).rejects.toThrow('No file system');
    await expect(Directory.pickDirectoryAsync()).rejects.toThrow(
      'No file system',
    );
  });
});

it("draws icons with Android's Material Symbols", () => {
  expect(require('components/SystemIcon.web').default).toBe(
    require('components/SystemIcon.android').default,
  );
});
