import { Linking, Platform, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { render, screen } from '@testing-library/react-native';
import DeviceInfo from 'constants/DeviceInfo';
import FlatList from 'components/FlatList';
import HeaderTitle, { getTitleOptions } from 'components/HeaderTitle';
import { generateFingerprint } from 'helpers/fingerprint';
import { openSystemSettings } from 'helpers/systemSettings';

jest.mock('@shopify/flash-list', () => ({ FlashList: jest.fn(() => null) }));
// expo-crypto is ESM only; Node's UUIDs stand in for the native ones.
jest.mock('expo-crypto', () => ({
  randomUUID: () => require('crypto').randomUUID(),
}));

afterEach(() => jest.restoreAllMocks());

describe('FlatList', () => {
  const refresh = (
    <RefreshControl testID="refresh" refreshing={false} onRefresh={() => {}} />
  );

  it('pull to refresh everywhere but on Mac, which has no pull', async () => {
    const onRefresh = jest.fn();
    for (const mac of [false, true]) {
      jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(mac);
      await render(
        <FlatList
          data={[1]}
          renderItem={() => null}
          refreshing={false}
          onRefresh={onRefresh}
          refreshControl={refresh}
        />,
      );
      expect(jest.mocked(FlashList).mock.lastCall![0]).toMatchObject({
        contentInsetAdjustmentBehavior: 'automatic',
        onRefresh: mac ? undefined : onRefresh,
        refreshControl: mac ? undefined : refresh,
      });
    }
  });
});

describe('HeaderTitle', () => {
  it('shows a title with its subtitle', async () => {
    await render(<HeaderTitle title="Title" subtitle="Subtitle" />);
    expect(screen.getByText('Title')).toBeTruthy();
    expect(screen.getByText('Subtitle')).toBeTruthy();
    await render(<HeaderTitle title="Title" />);
    expect(screen.queryByText('Subtitle')).toBeNull();
  });

  it('uses the native subtitle where the system has one', async () => {
    const optionsWith = (nativeSubtitle: boolean) => {
      let options: ReturnType<typeof getTitleOptions> = {} as never;
      jest.isolateModules(() => {
        jest.doMock('constants/DeviceInfo', () => ({
          supportsNativeSubtitle: () => nativeSubtitle,
        }));
        options = require('components/HeaderTitle').getTitleOptions('T', 'S');
      });
      return options;
    };
    expect(optionsWith(true)).toEqual({ title: 'T', headerSubtitle: 'S' });
    expect(optionsWith(false)).toEqual({
      title: 'T',
      headerTitle: expect.any(Function),
    });
  });
});

describe('system settings', () => {
  it("opens the app's settings, or the System Settings pane on Mac", async () => {
    const openSettings = jest
      .spyOn(Linking, 'openSettings')
      .mockResolvedValue();
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
    const os = Platform.OS;
    Platform.OS = 'android';
    jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(false);
    const openSettings = jest
      .spyOn(Linking, 'openSettings')
      .mockResolvedValue();
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
    Platform.OS = os;
  });
});

it('makes a fresh 32-digit hex fingerprint each time', () => {
  const a = generateFingerprint();
  expect(a).toMatch(/^[0-9a-f]{32}$/);
  expect(generateFingerprint()).not.toBe(a);
});
