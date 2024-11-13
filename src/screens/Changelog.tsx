import {useEffect, useRef, useState} from 'react';
import {Linking, Platform, StyleSheet} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import WebView, {WebViewNavigation} from 'react-native-webview';
import {ProgressBar} from 'react-native-paper';
import SafeArea from 'components/SafeArea';
import {useAppDispatch} from 'data/store';
import {setSetting} from 'data/actions/settings';
import useNavigationAnimation from 'hooks/useNavigationAnimation';
import {SettingsStackParams} from './types';
import packageJson from '../../package.json';

type Props = NativeStackScreenProps<SettingsStackParams, 'Changelog'>;

const Changelog: React.FC<Props> = props => {
  const dispatch = useAppDispatch();

  const webViewRef = useRef<WebView>(null);
  const [progress, setProgress] = useState(0);

  const onNavigationStateChange = (e: WebViewNavigation) => {
    if (e.navigationType === 'click') {
      if (webViewRef.current) {
        webViewRef.current.stopLoading();
      }
      Linking.openURL(e.url);
    }
  };

  useNavigationAnimation(props);

  useEffect(() => {
    dispatch(setSetting('lastShowChangelogVersion', packageJson.version));
  }, [dispatch]);

  return (
    <SafeArea>
      {progress ? (
        <ProgressBar style={styles.progressBar} progress={progress} />
      ) : undefined}
      <WebView
        ref={webViewRef}
        originWhitelist={['https://github.com']}
        onNavigationStateChange={onNavigationStateChange}
        onLoadProgress={({nativeEvent}) => {
          // New architecture doesn't like native floats
          setProgress(parseFloat(nativeEvent.progress.toFixed(2)));
        }}
        decelerationRate={Platform.OS === 'ios' ? 'normal' : undefined}
        source={{
          uri: 'https://github.com/robertying/learnX/releases',
        }}
        style={{backgroundColor: 'transparent'}}
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
});

export default Changelog;
