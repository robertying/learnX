import {useEffect, useRef, useState} from 'react';
import {Linking, Platform} from 'react-native';
import WebView, {WebViewProps} from 'react-native-webview';
import {
  WebViewMessageEvent,
  WebViewNavigation,
  WebViewSource,
  WebViewSourceHtml,
} from 'react-native-webview/lib/WebViewTypes';
import CookieManager from '@react-native-cookies/cookies';

const AutoHeightWebView: React.FC<
  React.PropsWithChildren<WebViewProps>
> = props => {
  const [height, setHeight] = useState(0);
  const [cookieString, setCookieString] = useState('');

  const webViewRef = useRef<WebView>(null);

  const onMessage = (e: WebViewMessageEvent) => {
    setHeight(parseInt(e.nativeEvent.data, 10));
  };

  const onNavigationStateChange = (e: WebViewNavigation) => {
    if (e.navigationType === 'click') {
      if (webViewRef.current) {
        webViewRef.current.stopLoading();
      }
      Linking.openURL(e.url);
    }
  };

  const injectedScript = `
    function waitForBridge() {
      if (!window.ReactNativeWebView.postMessage) {
        setTimeout(waitForBridge, 200);
      } else {
        window.ReactNativeWebView.postMessage(
          Math.max(
            document.documentElement.clientHeight,
            document.documentElement.scrollHeight,
            document.body.clientHeight,
            document.body.scrollHeight
          )
        );
      }
    }
    waitForBridge();
    true;
  `;

  useEffect(() => {
    CookieManager.get('https://learn.tsinghua.edu.cn').then(cookies => {
      setCookieString(
        Object.entries(cookies)
          .map(([key, value]) => `${key}=${value.value}`)
          .join('; '),
      );
    });
  }, []);

  return (
    <WebView
      ref={webViewRef}
      injectedJavaScript={injectedScript}
      onMessage={onMessage}
      javaScriptEnabled
      showsHorizontalScrollIndicator
      showsVerticalScrollIndicator={false}
      onNavigationStateChange={onNavigationStateChange}
      decelerationRate="normal"
      originWhitelist={['*']}
      {...props}
      source={
        {
          baseUrl: (props.source as WebViewSourceHtml | undefined)?.html
            ? 'https://learn.tsinghua.edu.cn'
            : undefined,
          headers: {
            Cookie: cookieString,
          },
          ...props.source,
        } as WebViewSource
      }
      style={[
        {
          height,
          backgroundColor: 'transparent',
          opacity: Platform.OS === 'android' ? 0.99 : 1,
          minHeight: 1,
        },
        props.style,
      ]}
    />
  );
};

export default AutoHeightWebView;
