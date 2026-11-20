import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-screens/experimental';
import ProgressBar from 'components/ProgressBar';
import { underHeader } from 'constants/scrollInsetBehavior';
import { isApple } from 'helpers/platform';

/**
 * A web page's loading progress (or an upload's), over the top of the screen
 * and right below the header: on iPhone and iPad, where the page is under the header, it keeps
 * clear of the top safe area, which includes the header (`underHeader`).
 */
const PageProgressBar: React.FC<{
  progress: number;
  /** What loads, for screen readers. */
  accessibilityLabel: string;
  testID?: string;
}> = ({ progress, accessibilityLabel, testID }) =>
  isApple() && underHeader() ? (
    <SafeAreaView
      edges={{ top: true }}
      style={styles.overlay}
      pointerEvents="none"
      testID={testID}
    >
      <ProgressBar
        progress={progress}
        accessibilityLabel={accessibilityLabel}
      />
    </SafeAreaView>
  ) : (
    <View style={styles.overlay} pointerEvents="none" testID={testID}>
      <ProgressBar
        progress={progress}
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    // Its own height, not the screen's (SafeAreaView flexes by default).
    flex: 0,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
});

export default PageProgressBar;
