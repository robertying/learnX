import { Platform, StyleSheet } from 'react-native';
import WebView from 'react-native-webview';
import ProgressBar from 'components/ProgressBar';
import SafeArea from 'components/SafeArea';
import useWebViewProgress from 'hooks/useWebViewProgress';

const releasesUrl = 'https://github.com/robertying/learnX/releases';

// In Settings and in the What's New sheet, so it takes no navigation props.
const Changelog: React.FC = () => {
  const { progress, loading, onLoadProgress } = useWebViewProgress();

  return (
    <SafeArea>
      {loading ? (
        <ProgressBar style={styles.progressBar} progress={progress} />
      ) : null}
      <WebView
        style={styles.webView}
        source={{ uri: releasesUrl }}
        onLoadProgress={onLoadProgress}
        decelerationRate={Platform.OS === 'ios' ? 'normal' : undefined}
      />
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99,
  },
  webView: {
    backgroundColor: 'transparent',
  },
});

export default Changelog;
