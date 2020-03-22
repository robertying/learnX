import React, {useRef, useState} from 'react';
import {Linking} from 'react-native';
import WebView, {WebViewProps} from 'react-native-webview';
import {
  WebViewMessageEvent,
  WebViewNavigation,
} from 'react-native-webview/lib/WebViewTypes';

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

const AutoHeightWebView: React.FC<WebViewProps> = (props) => {
  const [height, setHeight] = useState(400);

  const onMessage = (e: WebViewMessageEvent) => {
    setHeight(parseInt(e.nativeEvent.data, 10));
  };

  const webViewRef = useRef<WebView>(null);

  const onNavigationStateChange = (e: WebViewNavigation) => {
    if (e.navigationType === 'click') {
      if (webViewRef.current) {
        webViewRef.current.stopLoading();
      }
      Linking.openURL(e.url);
    }
  };

  return (
    <WebView
      originWhitelist={['*']}
      ref={webViewRef}
      injectedJavaScript={injectedScript}
      onMessage={onMessage}
      javaScriptEnabled={true}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      onNavigationStateChange={onNavigationStateChange}
      decelerationRate="normal"
      scrollEnabled={false}
      {...props}
      style={[{height, backgroundColor: 'transparent'}, props.style]}
    />
  );
};

export default AutoHeightWebView;
