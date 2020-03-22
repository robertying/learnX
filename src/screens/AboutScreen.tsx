import React, {useEffect} from 'react';
import {
  Linking,
  SafeAreaView,
  ScrollView,
  Text,
  StyleSheet,
} from 'react-native';
import {iOSUIKit} from 'react-native-typography';
import packageConfig from '../../package.json';
import TextButton from '../components/TextButton';
import Colors from '../constants/Colors';
import {getTranslation} from '../helpers/i18n';
import {INavigationScreen} from '../types';
import DeviceInfo from '../constants/DeviceInfo';
import {getScreenOptions} from '../helpers/navigation';
import {adaptToSystemTheme} from '../helpers/darkmode';
import {useColorScheme} from 'react-native-appearance';

const styles = StyleSheet.create({
  center: {
    alignSelf: 'center',
    marginBottom: 20,
  },
});

const AboutScreen: INavigationScreen = (props) => {
  const onGitHubLinkPress = () => {
    Linking.openURL('https://github.com/robertying/learnX');
  };

  const colorScheme = useColorScheme();

  useEffect(() => {
    adaptToSystemTheme(props.componentId, colorScheme);
  }, [colorScheme, props.componentId]);

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: Colors.system('background', colorScheme),
      }}>
      <ScrollView
        contentContainerStyle={[
          styles.center,
          {
            paddingTop: 30,
            paddingBottom: 30,
          },
        ]}>
        <Text
          style={[
            styles.center,
            {
              fontSize: iOSUIKit.bodyObject.fontSize,
              color: Colors.system('foreground', colorScheme),
            },
          ]}>
          {`v${packageConfig.version} (build ${DeviceInfo.buildNo()})`}
        </Text>
        <TextButton
          style={styles.center}
          textStyle={{
            fontSize: iOSUIKit.bodyObject.fontSize,
            color: Colors.system('purple', colorScheme),
          }}
          onPress={onGitHubLinkPress}>
          robertying / learnX @ GitHub
        </TextButton>
        <Text
          style={[
            styles.center,
            {
              fontSize: iOSUIKit.bodyObject.fontSize,
              color: Colors.system('foreground', colorScheme),
            },
          ]}>
          Copyright (c) 2020 Rui Ying
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

AboutScreen.options = getScreenOptions(getTranslation('about'));

export default AboutScreen;
