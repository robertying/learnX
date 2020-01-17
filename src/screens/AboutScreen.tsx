import React, {useEffect} from 'react';
import {Linking, SafeAreaView, ScrollView} from 'react-native';
import {iOSUIKit} from 'react-native-typography';
import packageConfig from '../../package.json';
import Text from '../components/Text';
import TextButton from '../components/TextButton';
import Colors from '../constants/Colors';
import {getTranslation} from '../helpers/i18n';
import {INavigationScreen} from '../types';
import {useDarkMode} from 'react-native-dark-mode';
import DeviceInfo from '../constants/DeviceInfo';
import {getScreenOptions} from '../helpers/navigation';
import {adaptToSystemTheme} from '../helpers/darkmode';

const AboutScreen: INavigationScreen<{}> = props => {
  const onGitHubLinkPress = () => {
    Linking.openURL('https://github.com/robertying/learnX');
  };

  const isDarkMode = useDarkMode();

  useEffect(() => {
    adaptToSystemTheme(props.componentId, isDarkMode, true);
  }, [isDarkMode, props.componentId]);

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: isDarkMode ? 'black' : 'white',
      }}>
      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
          paddingTop: 30,
          paddingBottom: 30,
        }}>
        <Text
          style={{
            alignSelf: 'center',
            marginBottom: 20,
            fontSize: iOSUIKit.bodyObject.fontSize,
          }}>
          {`v${packageConfig.version} (${DeviceInfo.buildNo()})`}
        </Text>
        <TextButton
          style={{
            alignSelf: 'center',
            marginBottom: 20,
          }}
          textStyle={{
            fontSize: iOSUIKit.bodyObject.fontSize,
            color: isDarkMode ? Colors.purpleDark : Colors.purpleLight,
          }}
          onPress={onGitHubLinkPress}>
          robertying / learnX @ GitHub
        </TextButton>
        <Text
          style={{
            alignSelf: 'center',
            marginBottom: 20,
            fontSize: iOSUIKit.bodyObject.fontSize,
          }}>
          Copyright (c) 2020 Rui Ying
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

AboutScreen.options = getScreenOptions(getTranslation('about'));

export default AboutScreen;
