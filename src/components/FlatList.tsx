import { FlashList, FlashListProps } from '@shopify/flash-list';

function FlatList<T>(props: FlashListProps<T>) {
  return <FlashList contentInsetAdjustmentBehavior="automatic" {...props} />;
}

export default FlatList;
