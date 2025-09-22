import { FlatListProps, FlatList as RNFlatList } from 'react-native';
import { useBottomTabBarHeight } from 'react-native-bottom-tabs';

function FlatList<T>(props: FlatListProps<T>) {
  const tabBarHeight = useBottomTabBarHeight();
  return (
    <RNFlatList
      {...props}
      contentContainerStyle={[
        { paddingBottom: tabBarHeight },
        props.contentContainerStyle,
      ]}
    />
  );
}

export default FlatList;
