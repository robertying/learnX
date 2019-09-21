import React, {useEffect, useRef} from 'react';
import {SafeAreaView, Linking} from 'react-native';
import {initialMode, useDarkMode} from 'react-native-dark-mode';
import {getTranslation, getLocale} from '../helpers/i18n';
import {INavigationScreen} from '../types/NavigationScreen';
import MarkdownWebView from 'react-native-github-markdown';
import {Navigation} from 'react-native-navigation';
import WebView, {WebViewProps} from 'react-native-webview';

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

  const webViewRef = useRef<WebView>(null);

  const onNavigationStateChange: WebViewProps['onNavigationStateChange'] = e => {
    if (e.navigationType === 'click') {
      if (webViewRef.current) {
        webViewRef.current.stopLoading();
      }
      Linking.openURL(e.url);
    }
  };

  useEffect(() => {
    Navigation.mergeOptions(props.componentId, {
      topBar: {
        title: {
          component: {
            name: 'text',
            passProps: {
              children: getTranslation('help'),
              style: {
                fontSize: 17,
                fontWeight: '500',
                color: isDarkMode ? 'white' : 'black',
              },
            },
          },
        },
      },
    });
  }, [isDarkMode, props.componentId]);

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

HelpScreen.options = {
  topBar: {
    title: {
      component: {
        name: 'text',
        passProps: {
          children: getTranslation('help'),
          style: {
            fontSize: 17,
            fontWeight: '500',
            color: initialMode === 'dark' ? 'white' : 'black',
          },
        },
      },
    },
  },
};

export default HelpScreen;
