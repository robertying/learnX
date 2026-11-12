import { useRef, useState } from 'react';
import { Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type WebView from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import ScreenWebView from 'components/ScreenWebView';
import BrowserToolbar from 'components/BrowserToolbar';
import { CourseXParamList } from 'navigation/types';

type Props = NativeStackScreenProps<CourseXParamList, 'CourseX'>;

const CourseX: React.FC<Props> = ({ route }) => {
  const courseId = route.params?.id ?? '';

  const webViewRef = useRef<WebView | null>(null);
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
    <ScreenWebView
      ref={webViewRef}
      source={{
        uri: 'https://tsinghua.app/courses' + (courseId ? `/${courseId}` : ''),
      }}
      originWhitelist={['https://']}
      // The iOS toolbar floats over the page, so the page scrolls clear of
      // it too; the automatic inset already covers the bottom safe area.
      contentInset={{ bottom: Math.max(0, toolbarOverlap - insets.bottom) }}
      onNavigationStateChange={handleNavigation}
    >
      {({ loading }) => (
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
      )}
    </ScreenWebView>
  );
};

export default CourseX;
