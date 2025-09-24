import {
  Platform,
  ScrollView as RNScrollView,
  ScrollViewProps,
} from 'react-native';
import { useBottomTabBarHeight } from 'react-native-bottom-tabs';

const ScrollView: React.FC<ScrollViewProps> = props => {
  const tabBarHeight = useBottomTabBarHeight();
  return (
    <RNScrollView
      {...props}
      contentContainerStyle={[
        { paddingBottom: Platform.OS === 'android' ? 16 : tabBarHeight + 16 },
        props.contentContainerStyle,
      ]}
    />
  );
};

export default ScrollView;
