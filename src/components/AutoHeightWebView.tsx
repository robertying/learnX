import { useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import WebView, { WebViewProps } from 'react-native-webview';
import {
  WebViewMessageEvent,
  ShouldStartLoadRequest,
  WebViewSource,
  WebViewSourceHtml,
} from 'react-native-webview/lib/WebViewTypes';
import CookieManager from '@preeternal/react-native-cookie-manager';
import { recordError } from 'helpers/crashReporting';
import Urls from 'constants/Urls';

/** Whether a load is the web view's own page: HTML at Web Learning's root. */
const isOwnPage = (url: string) =>
  url.startsWith('about:') || url.replace(/\/?(#.*)?$/, '') === Urls.learn;

const AutoHeightWebView: React.FC<
  React.PropsWithChildren<WebViewProps>
> = props => {
  const [height, setHeight] = useState(0);
  const [cookieString, setCookieString] = useState('');

  const webViewRef = useRef<WebView>(null);

  const onMessage = (e: WebViewMessageEvent) => {
    const measuredHeight = parseInt(e.nativeEvent.data, 10);
    if (isNaN(measuredHeight) || measuredHeight < 1) {
      return;
    }
    setHeight(measuredHeight);
  };

  // A tapped link opens outside the app instead of replacing the content, and
  // nothing else replaces it either. iOS asks about every load, the page's own
  // too, and says which came from a tap; Android asks only about loads the
  // page starts, so all of those are links (and never reports
  // `navigationType`, which `onNavigationStateChange` relied on).
  const onShouldStartLoadWithRequest = (request: ShouldStartLoadRequest) => {
    if (request.isTopFrame === false) {
      return true;
    }
    if (Platform.OS === 'ios' && request.navigationType !== 'click') {
      // The HTML loads at its base URL; a redirect, form or refresh in the
      // content must not take its place.
      return isOwnPage(request.url);
    }
    // Course content is written by teachers; only open web and mail links.
    if (/^(https?|mailto):/i.test(request.url)) {
      Linking.openURL(request.url).catch(() => {});
    }
    return false;
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
    void (async () => {
      let cookies: Awaited<ReturnType<typeof CookieManager.get>>;
      try {
        cookies = await CookieManager.get(Urls.learn);
      } catch (error) {
        recordError(error);
        return;
      }
      // The page still loads with the Cookie header below if these fail.
      await Promise.all(
        Object.entries(cookies).map(([, value]) =>
          CookieManager.set(
            Urls.learn,
            value.sameSite === 'none' ? { ...value, secure: true } : value,
            true,
          ),
        ),
      ).catch(recordError);

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
      // Sized to its content, so the page around it scrolls vertically; it
      // only scrolls sideways itself, for wide tables and images. Without
      // the bounce, a vertical drag goes to the page.
      bounces={false}
      directionalLockEnabled
      onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
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
