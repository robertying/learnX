import { FlashList, FlashListProps } from '@shopify/flash-list';
import DeviceInfo from 'constants/DeviceInfo';

function FlatList<T>(props: FlashListProps<T>) {
  const isMac = DeviceInfo.isMac();
  return (
    <FlashList
      contentInsetAdjustmentBehavior="automatic"
      {...props}
      refreshControl={isMac ? undefined : props.refreshControl}
      onRefresh={isMac ? undefined : props.onRefresh}
      refreshing={isMac ? undefined : props.refreshing}
    />
  );
}

export default FlatList;
