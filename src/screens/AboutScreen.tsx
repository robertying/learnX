import React, {useEffect} from 'react';
import {Linking, SafeAreaView, ScrollView} from 'react-native';
import {iOSUIKit} from 'react-native-typography';
import packageConfig from '../../package.json';
import Text from '../components/Text';
import TextButton from '../components/TextButton';
import Colors from '../constants/Colors';
import {getTranslation} from '../helpers/i18n';
import {INavigationScreen} from '../types/NavigationScreen';
import {useDarkMode, initialMode} from 'react-native-dark-mode';
import {Navigation} from 'react-native-navigation';
import DeviceInfo from '../constants/DeviceInfo';

const AboutScreen: INavigationScreen<{}> = props => {
  const onGitHubLinkPress = () => {
    Linking.openURL('https://github.com/robertying/learnX');
  };

  const isDarkMode = useDarkMode();

  useEffect(() => {
    Navigation.mergeOptions(props.componentId, {
      topBar: {
        title: {
          component: {
            name: 'text',
            passProps: {
              children: getTranslation('about'),
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
      <ScrollView
        style={{flex: 1}}
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
            color: isDarkMode ? 'white' : 'black',
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
          Copyright (c) 2019 Rui Ying
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

// tslint:disable-next-line: no-object-mutation
AboutScreen.options = {
  topBar: {
    title: {
      component: {
        name: 'text',
        passProps: {
          children: getTranslation('about'),
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

export default AboutScreen;
