import { ScrollView as RNScrollView, ScrollViewProps } from 'react-native';
import DeviceInfo from 'constants/DeviceInfo';

const ScrollView: React.FC<ScrollViewProps> = props => {
  return (
    <RNScrollView
      contentInsetAdjustmentBehavior="automatic"
      {...props}
      refreshControl={DeviceInfo.isMac() ? undefined : props.refreshControl}
    />
  );
};

export default ScrollView;
