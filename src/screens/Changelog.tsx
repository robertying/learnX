import { useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import WebView from 'react-native-webview';
import ProgressBar from 'components/ProgressBar';
import SafeArea from 'components/SafeArea';
import { setChangelogSeen } from 'data/appState';
import useWebViewProgress from 'hooks/useWebViewProgress';
import { SettingsStackParams } from './types';
import packageJson from '../../package.json';

type Props = NativeStackScreenProps<SettingsStackParams, 'Changelog'>;

const releasesUrl = 'https://github.com/robertying/learnX/releases';

const Changelog: React.FC<Props> = () => {
  const { progress, loading, onLoadProgress } = useWebViewProgress();

  useEffect(() => {
    setChangelogSeen(packageJson.version);
  }, []);

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
