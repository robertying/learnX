import { Platform, View, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-screens/experimental';
import Styles from 'constants/Styles';

const SafeArea: React.FC<ViewProps> = ({ style, ...props }) => {
  const insets = useSafeAreaInsets();

  if (Platform.OS === 'ios') {
    // Applied natively, in the same layout pass as the insets change (e.g.
    // while a split view's sidebar slides in or out), not a render later.
    return (
      <SafeAreaView
        edges={{ left: true, right: true }}
        style={style}
        {...props}
      />
    );
  }

  return (
    <View
      style={[
        Styles.flex1,
        {
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
        style,
      ]}
      {...props}
    />
  );
};

export default SafeArea;
