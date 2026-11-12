import { RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { render } from '@testing-library/react-native';
import DeviceInfo from 'constants/DeviceInfo';
import FlatList from 'components/FlatList';

jest.mock('@shopify/flash-list', () => ({ FlashList: jest.fn(() => null) }));

afterEach(() => jest.restoreAllMocks());

it('pulls to refresh everywhere but on Mac, which has no pull', async () => {
  const refresh = (
    <RefreshControl testID="refresh" refreshing={false} onRefresh={() => {}} />
  );
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
