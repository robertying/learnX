import React, {useRef, useEffect} from 'react';
import {SafeAreaView, Linking} from 'react-native';
import {useDarkMode} from 'react-native-dark-mode';
import {getTranslation, getLocale} from '../helpers/i18n';
import {INavigationScreen} from '../types';
import MarkdownWebView from 'react-native-github-markdown';
import WebView, {WebViewProps} from 'react-native-webview';
import {getScreenOptions} from '../helpers/navigation';
import {androidAdaptToSystemTheme} from '../helpers/darkmode';

declare const preval: any;

const markdown = getLocale().startsWith('zh')
  ? preval`
        const fs = require('fs')
        module.exports = fs.readFileSync(require.resolve('../assets/HELP_CN.md'), 'utf8')
`
  : preval`
        const fs = require('fs')
        module.exports = fs.readFileSync(require.resolve('../assets/HELP_EN.md'), 'utf8')
`;

const HelpScreen: INavigationScreen<{}> = props => {
  const isDarkMode = useDarkMode();

  useEffect(() => {
    androidAdaptToSystemTheme(props.componentId, isDarkMode, true);
  }, [isDarkMode, props.componentId]);

  const webViewRef = useRef<WebView>(null);

  const onNavigationStateChange: WebViewProps['onNavigationStateChange'] = e => {
    if (e.navigationType === 'click') {
      if (webViewRef.current) {
        webViewRef.current.stopLoading();
      }
      Linking.openURL(e.url);
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: isDarkMode ? 'black' : 'white',
      }}>
      <MarkdownWebView
        style={{backgroundColor: 'transparent'}}
        ref={webViewRef}
        content={markdown}
        highlight
        darkMode={isDarkMode}
        onNavigationStateChange={onNavigationStateChange}
      />
    </SafeAreaView>
  );
};

HelpScreen.options = getScreenOptions(getTranslation('help'));

export default HelpScreen;
