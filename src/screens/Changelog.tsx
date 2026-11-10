import { useEffect } from 'react';
import { Linking, Platform, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import WebView from 'react-native-webview';
import type { OnShouldStartLoadWithRequest } from 'react-native-webview/lib/WebViewTypes';
import ProgressBar from 'components/ProgressBar';
import SafeArea from 'components/SafeArea';
import { setSetting } from 'data/settings';
import useWebViewProgress from 'hooks/useWebViewProgress';
import { SettingsStackParams } from './types';
import packageJson from '../../package.json';

type Props = NativeStackScreenProps<SettingsStackParams, 'Changelog'>;

const releasesUrl = 'https://github.com/robertying/learnX/releases';

// The release notes stay here; any other page opens in the browser.
const handleRequest: OnShouldStartLoadWithRequest = request => {
  if (request.isTopFrame === false || request.url.startsWith(releasesUrl)) {
    return true;
  }
  void Linking.openURL(request.url);
  return false;
};

const Changelog: React.FC<Props> = () => {
  const { progress, loading, onLoadProgress } = useWebViewProgress();

  useEffect(() => {
    setSetting('lastShowChangelogVersion', packageJson.version);
  }, []);

  return (
    <SafeArea>
      {loading ? (
        <ProgressBar style={styles.progressBar} progress={progress} />
      ) : null}
      <WebView
        style={styles.webView}
        source={{ uri: releasesUrl }}
        onShouldStartLoadWithRequest={handleRequest}
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
