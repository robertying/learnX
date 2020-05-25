import React, {useRef, useEffect} from 'react';
import {SafeAreaView, Linking} from 'react-native';
import {getTranslation, getLocale} from '../helpers/i18n';
import {INavigationScreen} from '../types';
import MarkdownWebView from 'react-native-github-markdown';
import WebView, {WebViewProps} from 'react-native-webview';
import {getScreenOptions} from '../helpers/navigation';
import {adaptToSystemTheme} from '../helpers/darkmode';
import {useColorScheme} from 'react-native-appearance';
import Colors from '../constants/Colors';

declare const preval: any;

const markdown = getLocale().startsWith('zh')
  ? preval`
      const fs = require('fs');
      const path = require('path');
      module.exports = fs.readFileSync(path.resolve(process.cwd(), '../src/assets/HELP_CN.md'), 'utf8')
`
  : preval`
      const fs = require('fs');
      const path = require('path');
      module.exports = fs.readFileSync(path.resolve(process.cwd(), '../src/assets/HELP_EN.md'), 'utf8')
`;

const HelpScreen: INavigationScreen = (props) => {
  const colorScheme = useColorScheme();

  useEffect(() => {
    adaptToSystemTheme(props.componentId, colorScheme);
  }, [colorScheme, props.componentId]);

  const webViewRef = useRef<WebView>(null);

  const onNavigationStateChange: WebViewProps['onNavigationStateChange'] = (
    e,
  ) => {
    if (e.navigationType === 'click') {
      if (webViewRef.current) {
        webViewRef.current.stopLoading();
      }
      Linking.openURL(e.url);
    }
  };

  const injectedScript = `
  document.body.style.backgroundColor = "${Colors.system(
    'background',
    colorScheme,
  )}"
`;

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: Colors.system('background', colorScheme),
      }}>
      <MarkdownWebView
        style={{backgroundColor: 'transparent'}}
        ref={webViewRef}
        content={markdown}
        highlight
        darkMode={colorScheme === 'dark'}
        onNavigationStateChange={onNavigationStateChange}
        injectedJavaScript={injectedScript}
      />
    </SafeAreaView>
  );
};

HelpScreen.options = getScreenOptions(getTranslation('help'));

export default HelpScreen;
