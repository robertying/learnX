import { useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import WebView, { WebViewProps } from 'react-native-webview';
import {
  WebViewMessageEvent,
  WebViewNavigation,
  WebViewSource,
  WebViewSourceHtml,
} from 'react-native-webview/lib/WebViewTypes';
import CookieManager from '@preeternal/react-native-cookie-manager';
import Urls from 'constants/Urls';

const AutoHeightWebView: React.FC<
  React.PropsWithChildren<WebViewProps>
> = props => {
  const [height, setHeight] = useState(0);
  const [cookieString, setCookieString] = useState('');

  const webViewRef = useRef<WebView>(null);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const measuredHeight = parseInt(e.nativeEvent.data, 10);
      if (isNaN(measuredHeight) || measuredHeight < 1) {
        return;
      }
      setHeight(measuredHeight);
    } catch {}
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
    var lastHeight = 0;

    // Measure the content itself rather than the viewport: the client/scroll
    // height of the root element is never smaller than the web view, so it
    // could not shrink once the content reflows into fewer lines.
    function measure() {
      return Math.ceil(
        Math.max(
          document.documentElement?.getBoundingClientRect().height ?? 0,
          document.body?.getBoundingClientRect().height ?? 0,
          document.body?.scrollHeight ?? 0
        )
      );
    }

    function waitForBridge() {
      if (!window.ReactNativeWebView?.postMessage) {
        setTimeout(waitForBridge, 200);
      } else {
        var height = measure();
        if (height !== lastHeight) {
          lastHeight = height;
          window.ReactNativeWebView.postMessage(height.toString());
        }
      }
    }

    // Content reflows when the web view is resized (rotation, split view,
    // window resizing) or when images and such finish loading
    function observe() {
      if (!window.ResizeObserver) {
        return;
      }
      var observer = new ResizeObserver(waitForBridge);
      if (document.documentElement) {
        observer.observe(document.documentElement);
      }
      if (document.body) {
        observer.observe(document.body);
      }
    }

    document.addEventListener("DOMContentLoaded", function () {
      observe();
      waitForBridge();
    });
    window.addEventListener("load", waitForBridge);
    window.addEventListener("resize", waitForBridge);

    // Update height as long as there's something
    waitForBridge();

    true;
  `;

  useEffect(() => {
    (async () => {
      const cookies = await CookieManager.get(Urls.learn);
      await Promise.all(
        Object.entries(cookies).map(([, value]) =>
          CookieManager.set(
            Urls.learn,
            value.sameSite === 'none' ? { ...value, secure: true } : value,
            true,
          ),
        ),
      );

      setCookieString(
        Object.entries(cookies)
          .map(([key, value]) => `${key}=${value.value}`)
          .join('; '),
      );
    })();
  }, []);

  return (
    <WebView
      ref={webViewRef}
      injectedJavaScriptBeforeContentLoaded={injectedScript}
      onMessage={onMessage}
      javaScriptEnabled
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      onNavigationStateChange={onNavigationStateChange}
      decelerationRate={Platform.OS === 'ios' ? 'normal' : undefined}
      originWhitelist={['*']}
      sharedCookiesEnabled
      {...props}
      source={
        {
          baseUrl: (props.source as WebViewSourceHtml | undefined)?.html
            ? Urls.learn
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
