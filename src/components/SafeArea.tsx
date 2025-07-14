import { View } from 'react-native';
import {
  SafeAreaViewProps,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Styles from 'constants/Styles';

const SafeArea: React.FC<
  React.PropsWithChildren<SafeAreaViewProps>
> = props => {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        Styles.flex1,
        {
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
      {...props}
    />
  );
};

export default SafeArea;
