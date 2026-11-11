import { Platform, StyleSheet } from 'react-native';
import WebView from 'react-native-webview';
import PageProgressBar from 'components/PageProgressBar';
import SafeArea from 'components/SafeArea';
import useWebViewProgress from 'hooks/useWebViewProgress';

const releasesUrl = 'https://github.com/robertying/learnX/releases';

// In Settings and in the What's New sheet, so it takes no navigation props.
const Changelog: React.FC = () => {
  const { progress, loading, onLoadProgress } = useWebViewProgress();

  return (
    <SafeArea>
      {loading ? <PageProgressBar progress={progress} /> : null}
      <WebView
        style={styles.webView}
        source={{ uri: releasesUrl }}
        onLoadProgress={onLoadProgress}
        decelerationRate={Platform.OS === 'ios' ? 'normal' : undefined}
        // Below the header, and under its glass from iOS 26.
        contentInsetAdjustmentBehavior="automatic"
      />
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  webView: {
    backgroundColor: 'transparent',
  },
});

export default Changelog;
