import React, {useEffect, useRef, useState} from 'react';
import {Linking, SafeAreaView} from 'react-native';
import {ProgressBar} from 'react-native-paper';
import WebView from 'react-native-webview';
import {Navigation} from 'react-native-navigation';
import {OnShouldStartLoadWithRequest} from 'react-native-webview/lib/WebViewTypes';
import Colors from '../constants/Colors';
import {INavigationScreen} from '../types';
import {setCookieFromCredentials} from '../helpers/thursday';
import {getScreenOptions} from '../helpers/navigation';
import {getTranslation} from '../helpers/i18n';
import packageConfig from '../../package.json';
import {loadIconsSync} from '../helpers/icons';

export interface ThursdayScreenProps {
  type: 'enroll' | 'discuss';
  courseName: string;
  courseTeacherName: string;
}

const ThursdayScreen: INavigationScreen<ThursdayScreenProps> = ({
  type,
  courseName,
  courseTeacherName,
  componentId,
}) => {
  const url = `https://thu.community/topics/${
    type === 'enroll' ? '2' : '8'
  }?tag=${courseName}&tag=${courseTeacherName}`;

  const [cookieSet, setCookieSet] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    Navigation.mergeOptions(componentId, {
      topBar: {
        rightButtons: [
          {
            id: 'refresh',
            icon: loadIconsSync().refresh,
            color: Colors.system('purple'),
          },
          {
            id: 'back',
            icon: loadIconsSync()['arrow-back'],
            color: Colors.system('purple'),
          },
        ],
      },
    });
  }, [componentId]);

  useEffect(() => {
    (async () => {
      await setCookieFromCredentials();
      setCookieSet(true);
    })();
  }, []);

  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    const listener = ({buttonId}: {buttonId: string}) => {
      if (buttonId === 'refresh') {
        webViewRef.current?.reload();
      }
      if (buttonId === 'back') {
        webViewRef.current?.goBack();
      }
    };
    const handle = Navigation.events().registerNavigationButtonPressedListener(
      listener,
    );
    return () => handle.remove();
  }, []);

  const handleShouldStartLoadWithRequest: OnShouldStartLoadWithRequest = (
    request,
  ) => {
    if (request.url.endsWith('/register')) {
      Linking.openURL(request.url);
      return false;
    }
    return true;
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
      }}>
      {loadProgress !== 1 && (
        <ProgressBar
          color={Colors.theme}
          indeterminate={!cookieSet}
          progress={loadProgress}
        />
      )}
      {cookieSet && (
        <WebView
          ref={webViewRef}
          source={{
            uri: url,
          }}
          originWhitelist={['https://thu.community', 'https://thu.wtf']}
          // @ts-ignore
          applicationNameForUserAgent={`learnX/${packageConfig.version}`}
          decelerationRate="normal"
          onLoadProgress={({nativeEvent}) => {
            setLoadProgress(nativeEvent.progress);
          }}
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        />
      )}
    </SafeAreaView>
  );
};

ThursdayScreen.options = getScreenOptions(getTranslation('thursday'));

export default ThursdayScreen;
