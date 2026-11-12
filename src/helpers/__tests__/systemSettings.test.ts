import { Linking, Platform } from 'react-native';
import DeviceInfo from 'constants/DeviceInfo';
import { openSystemSettings } from 'helpers/systemSettings';

it("opens the app's settings, or the System Settings pane on Mac", async () => {
  const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue();
  jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(false);
  await openSystemSettings('notifications');
  expect(openSettings).toHaveBeenCalled();

  jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
  await openSystemSettings('security');
  expect(openURL).toHaveBeenCalledWith(
    'x-apple.systempreferences:com.apple.preference.security',
  );
});

it("opens the app's notification page on Android", async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(false);
  const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  const sendIntent = jest.spyOn(Linking, 'sendIntent').mockResolvedValue();
  await openSystemSettings('notifications');
  expect(sendIntent).toHaveBeenCalledWith(
    'android.settings.APP_NOTIFICATION_SETTINGS',
    [
      {
        key: 'android.provider.extra.APP_PACKAGE',
        value: 'io.robertying.learnx',
      },
    ],
  );
  expect(openSettings).not.toHaveBeenCalled();

  // Without that page, the app's page; calendars always there.
  sendIntent.mockRejectedValueOnce(new Error('No activity'));
  await openSystemSettings('notifications');
  await openSystemSettings('security');
  expect(openSettings).toHaveBeenCalledTimes(2);
  expect(sendIntent).toHaveBeenCalledTimes(2);
});
