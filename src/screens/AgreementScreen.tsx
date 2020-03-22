import React, {useRef, useEffect} from 'react';
import {SafeAreaView, Linking} from 'react-native';
import {getTranslation, getLocale} from '../helpers/i18n';
import {INavigationScreen} from '../types';
import MarkdownWebView from 'react-native-github-markdown';
import WebView, {WebViewProps} from 'react-native-webview';
import {useDispatch} from 'react-redux';
import {Navigation} from 'react-native-navigation';
import {useColorScheme} from 'react-native-appearance';
import {getScreenOptions} from '../helpers/navigation';
import {adaptToSystemTheme} from '../helpers/darkmode';
import Colors from '../constants/Colors';
import RaisedButton from '../components/RaisedButton';
import {useTypedSelector} from '../redux/store';
import {setSetting} from '../redux/actions/settings';

declare const preval: any;

const markdown = getLocale().startsWith('zh')
  ? preval`
        const fs = require('fs')
        module.exports = fs.readFileSync(require.resolve('../assets/AGREEMENT_CN.md'), 'utf8')
`
  : preval`
        const fs = require('fs')
        module.exports = fs.readFileSync(require.resolve('../assets/AGREEMENT_EN.md'), 'utf8')
`;

const AgreementScreen: INavigationScreen = (props) => {
  const colorScheme = useColorScheme();

  const dispatch = useDispatch();
  const pushNotificationSettings = useTypedSelector(
    (state) => state.settings.pushNotifications,
  );

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

  const handleAcknowledge = () => {
    dispatch(
      setSetting('pushNotifications', {
        ...pushNotificationSettings,
        agreementAcknowledged: true,
      }),
    );
    Navigation.pop(props.componentId);
  };

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
      />
      <RaisedButton
        style={[
          {
            width: '100%',
            height: 40,
            alignSelf: 'center',
            borderRadius: 0,
            backgroundColor: Colors.system('purple', colorScheme),
          },
        ]}
        textStyle={{color: Colors.system('background', colorScheme)}}
        onPress={handleAcknowledge}>
        {getTranslation('acknowledge')}
      </RaisedButton>
    </SafeAreaView>
  );
};

AgreementScreen.options = getScreenOptions(getTranslation('agreement'));

export default AgreementScreen;
