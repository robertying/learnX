import { ScrollView as RNScrollView, ScrollViewProps } from 'react-native';

const ScrollView: React.FC<ScrollViewProps> = props => {
  return <RNScrollView contentInsetAdjustmentBehavior="automatic" {...props} />;
};

export default ScrollView;
