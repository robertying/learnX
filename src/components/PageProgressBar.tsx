import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-screens/experimental';
import ProgressBar from 'components/ProgressBar';

/**
 * A web page's loading progress, over the top of the page and below the
 * header, a transparent one too: on iOS it keeps clear of the top safe area,
 * which includes the header.
 */
const PageProgressBar: React.FC<{ progress: number }> = ({ progress }) =>
  Platform.OS === 'ios' ? (
    <SafeAreaView
      edges={{ top: true }}
      style={styles.overlay}
      pointerEvents="none"
    >
      <ProgressBar progress={progress} />
    </SafeAreaView>
  ) : (
    <View style={styles.overlay} pointerEvents="none">
      <ProgressBar progress={progress} />
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
