import { useRef, useState } from 'react';
import { Linking, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PageProgressBar from 'components/PageProgressBar';
import WebView, { WebViewNavigation } from 'react-native-webview';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import SafeArea from 'components/SafeArea';
import BrowserToolbar from 'components/BrowserToolbar';
import useWebViewProgress from 'hooks/useWebViewProgress';
import { CourseXParamList } from 'navigation/types';

type Props = NativeStackScreenProps<CourseXParamList, 'CourseX'>;

const CourseX: React.FC<Props> = ({ route }) => {
  const courseId = route.params?.id ?? '';

  const webViewRef = useRef<WebView | null>(null);
  const { progress, loading, onLoadProgress } = useWebViewProgress();
  const [currentUrl, setCurrentUrl] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [toolbarOverlap, setToolbarOverlap] = useState(0);
  const insets = useSafeAreaInsets();

  const handleNavigation = (e: WebViewNavigation) => {
    setCurrentUrl(e.url);
    setCanGoBack(e.canGoBack);
    setCanGoForward(e.canGoForward);
  };

  return (
    <SafeArea>
      {loading ? <PageProgressBar progress={progress} /> : null}
      <WebView
        ref={webViewRef}
        style={styles.webview}
        source={{
          uri:
            'https://tsinghua.app/courses' + (courseId ? `/${courseId}` : ''),
        }}
        originWhitelist={['https://']}
        decelerationRate={Platform.OS === 'ios' ? 'normal' : undefined}
        // Below the header, and under its glass from iOS 26. The iOS toolbar
        // floats over the page, so the page scrolls clear of it too; the
        // automatic inset already covers the bottom safe area.
        contentInsetAdjustmentBehavior="automatic"
        contentInset={{ bottom: Math.max(0, toolbarOverlap - insets.bottom) }}
        onLoadProgress={onLoadProgress}
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
