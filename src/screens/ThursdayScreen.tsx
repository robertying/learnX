import React, {useEffect, useState} from 'react';
import {SafeAreaView} from 'react-native';
import {ProgressBar} from 'react-native-paper';
import WebView from 'react-native-webview';
import Colors from '../constants/Colors';
import {INavigationScreen} from '../types';
import {setCookieFromCredentials} from '../helpers/thursday';
import {getScreenOptions} from '../helpers/navigation';
import {getTranslation} from '../helpers/i18n';
import packageConfig from '../../package.json';

export interface ThursdayScreenProps {
  type: 'enroll' | 'discuss';
  courseName: string;
  courseTeacherName: string;
}

const ThursdayScreen: INavigationScreen<ThursdayScreenProps> = ({
  type,
  courseName,
  courseTeacherName,
}) => {
  const url = `https://thu.community/topics/${
    type === 'enroll' ? '2' : '8'
  }?tag=${courseName}&tag=${courseTeacherName}`;

  const [cookieSet, setCookieSet] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    (async () => {
      await setCookieFromCredentials();
      setCookieSet(true);
    })();
  }, []);

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
        />
      )}
    </SafeAreaView>
  );
};

ThursdayScreen.options = getScreenOptions(getTranslation('thursday'));

export default ThursdayScreen;
