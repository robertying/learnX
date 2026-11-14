import { Platform, View, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-screens/experimental';
import Styles from 'constants/Styles';

export interface SafeAreaProps extends ViewProps {
  /**
   * iOS: also keep clear of the header and the tab bar, so nothing scrolls
   * under their glass. For content the app doesn't draw, such as a document
   * that stays white in dark mode: the bars' titles, buttons and the status
   * bar follow the app's appearance, not what is under them, and would be
   * white on white.
   */
  clearOfBars?: boolean;
}

const SafeArea: React.FC<SafeAreaProps> = ({
  style,
  clearOfBars,
  ...props
}) => {
  const insets = useSafeAreaInsets();

  if (Platform.OS === 'ios') {
    // Applied natively, in the same layout pass as the insets change (e.g.
    // while a split view's sidebar slides in or out), not a render later.
    return (
      <SafeAreaView
        edges={{
          left: true,
          right: true,
          top: clearOfBars,
          bottom: clearOfBars,
        }}
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
