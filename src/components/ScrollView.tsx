import { ScrollView as RNScrollView, ScrollViewProps } from 'react-native';
import { useBottomTabBarHeight } from 'react-native-bottom-tabs';

const ScrollView: React.FC<ScrollViewProps> = props => {
  const tabBarHeight = useBottomTabBarHeight();
  return (
    <RNScrollView
      {...props}
      contentContainerStyle={[
        { paddingBottom: tabBarHeight + 16 },
        props.contentContainerStyle,
      ]}
    />
  );
};

export default ScrollView;
