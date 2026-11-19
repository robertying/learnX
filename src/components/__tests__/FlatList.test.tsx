import { RefreshControl as NativeRefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { render } from '@testing-library/react-native';
import DeviceInfo from 'constants/DeviceInfo';
import FlatList from 'components/FlatList';
import RefreshControl from 'components/RefreshControl';

jest.mock('@shopify/flash-list', () => ({ FlashList: jest.fn(() => null) }));

const flashListProps = () => jest.mocked(FlashList).mock.lastCall![0];

it('pulls to refresh everywhere but on Mac, which has no pull', async () => {
  const refresh = (
    <NativeRefreshControl
      testID="refresh"
      refreshing={false}
      onRefresh={() => {}}
    />
  );
  for (const mac of [false, true]) {
    jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(mac);
    await render(
      <FlatList data={[1]} renderItem={() => null} refreshControl={refresh} />,
    );
    expect(flashListProps()).toMatchObject({
      contentInsetAdjustmentBehavior: 'automatic',
      refreshControl: mac ? undefined : refresh,
    });
  }
});

it("draws refreshing and onRefresh with the app's refresh control", async () => {
  const onRefresh = jest.fn();
  await render(
    <FlatList
      data={[1]}
      renderItem={() => null}
      refreshing
      onRefresh={onRefresh}
      progressViewOffset={12}
    />,
  );
  const { refreshControl, onRefresh: flashOnRefresh } = flashListProps();
  // FlashList would otherwise draw its own, untinted control.
  expect(flashOnRefresh).toBeUndefined();
  expect(refreshControl).toMatchObject({
    type: RefreshControl,
    props: { refreshing: true, onRefresh, progressViewOffset: 12 },
  });
});

it('has no refresh control without onRefresh', async () => {
  await render(<FlatList data={[1]} renderItem={() => null} />);
  expect(flashListProps().refreshControl).toBeUndefined();
});
