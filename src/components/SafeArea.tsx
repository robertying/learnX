import { Platform, View, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-screens/experimental';
import Styles from 'constants/Styles';

interface SafeAreaProps extends ViewProps {
  /**
   * Keep clear of the header too, for content that doesn't scroll from the
   * top (a scroll view keeps clear of it by itself). From iOS 26 the header
   * is transparent and the screen is laid out under it (`stackScreenOptions`);
   * elsewhere the screen already starts below the header.
   */
  top?: boolean;
}

const SafeArea: React.FC<SafeAreaProps> = ({ style, top, ...props }) => {
  const insets = useSafeAreaInsets();

  if (Platform.OS === 'ios') {
    // Applied natively, in the same layout pass as the insets change (e.g.
    // while a split view's sidebar slides in or out), not a render later.
    return (
      <SafeAreaView
        edges={{ left: true, right: true, top }}
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
