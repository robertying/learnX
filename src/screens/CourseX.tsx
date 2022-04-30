import {useRef, useState} from 'react';
import {Linking, StyleSheet, View} from 'react-native';
import {IconButton, ProgressBar, useTheme} from 'react-native-paper';
import WebView, {WebViewNavigation} from 'react-native-webview';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import SafeArea from 'components/SafeArea';
import {ScreenParams} from './types';

const CourseX: React.FC<
  React.PropsWithChildren<NativeStackScreenProps<ScreenParams, 'CourseX'>>
> = ({route}) => {
  const courseId = route.params?.id ?? '';

  const theme = useTheme();
  const safeAreaInsets = useSafeAreaInsets();

  const webViewRef = useRef<WebView | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentUrl, setCurrentUrl] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  const handleNavigation = (e: WebViewNavigation) => {
    setCurrentUrl(e.url);
    setCanGoBack(e.canGoBack);
    setCanGoForward(e.canGoForward);
  };

  return (
    <SafeArea>
      {progress && progress !== 1 ? <ProgressBar progress={progress} /> : null}
      <WebView
        ref={webViewRef}
        style={styles.webview}
        source={{
          uri:
            'https://tsinghua.app/courses' + (courseId ? `/${courseId}` : ''),
        }}
        originWhitelist={['https://']}
        decelerationRate="normal"
        androidHardwareAccelerationDisabled={true}
        onLoadProgress={({nativeEvent}) => {
          setProgress(nativeEvent.progress);
        }}
        onNavigationStateChange={handleNavigation}
      />
      <View
        style={[
          styles.toolbar,
          {
            backgroundColor: theme.colors.surface,
            paddingBottom: safeAreaInsets.bottom,
          },
        ]}>
        <IconButton
          icon="arrow-left"
          disabled={!canGoBack}
          onPress={() => webViewRef.current?.goBack()}
        />
        <IconButton
          icon="arrow-right"
          disabled={!canGoForward}
          onPress={() => webViewRef.current?.goForward()}
        />
        <IconButton
          icon="refresh"
          disabled={progress && progress !== 1 ? true : false}
          onPress={() => webViewRef.current?.reload()}
        />
        <IconButton
          icon="open-in-new"
          disabled={progress && progress !== 1 ? true : false}
          onPress={() => Linking.openURL(currentUrl)}
        />
      </View>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  webview: {
    backgroundColor: 'transparent',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
});

export default CourseX;
