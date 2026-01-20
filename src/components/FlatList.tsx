import { FlatListProps, FlatList as RNFlatList } from 'react-native';

function FlatList<T>(props: FlatListProps<T>) {
  return <RNFlatList contentInsetAdjustmentBehavior="automatic" {...props} />;
}

export default FlatList;
