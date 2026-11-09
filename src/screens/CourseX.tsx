import { useRef, useState } from 'react';
import { Linking, Platform, StyleSheet } from 'react-native';
import ProgressBar from 'components/ProgressBar';
import WebView, { WebViewNavigation } from 'react-native-webview';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import SafeArea from 'components/SafeArea';
import BrowserToolbar from 'components/BrowserToolbar';
import { CourseXParamList } from './types';

type Props = NativeStackScreenProps<CourseXParamList, 'CourseX'>;

const CourseX: React.FC<Props> = ({ route }) => {
  const courseId = route.params?.id ?? '';

  const webViewRef = useRef<WebView | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentUrl, setCurrentUrl] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [toolbarOverlap, setToolbarOverlap] = useState(0);

  const loading = progress !== 0 && progress !== 1;

  const handleNavigation = (e: WebViewNavigation) => {
    setCurrentUrl(e.url);
    setCanGoBack(e.canGoBack);
    setCanGoForward(e.canGoForward);
  };

  return (
    <SafeArea>
      {loading ? <ProgressBar progress={progress} /> : null}
      <WebView
        ref={webViewRef}
        style={styles.webview}
        source={{
          uri:
            'https://tsinghua.app/courses' + (courseId ? `/${courseId}` : ''),
        }}
        originWhitelist={['https://']}
        decelerationRate={Platform.OS === 'ios' ? 'normal' : undefined}
        // The iOS toolbar floats over the page, so the page scrolls clear of it.
        contentInset={{ bottom: toolbarOverlap }}
        onLoadProgress={({ nativeEvent }) => {
          // New architecture doesn't like native floats
          setProgress(parseFloat(nativeEvent.progress.toFixed(2)));
        }}
        onNavigationStateChange={handleNavigation}
      />
      <BrowserToolbar
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        loading={loading}
        onBack={() => webViewRef.current?.goBack()}
        onForward={() => webViewRef.current?.goForward()}
        onReload={() => webViewRef.current?.reload()}
        onOpenInBrowser={() => Linking.openURL(currentUrl)}
        onOverlapChange={setToolbarOverlap}
      />
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  webview: {
    backgroundColor: 'transparent',
  },
});

export default CourseX;
