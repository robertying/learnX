import React, {useEffect} from 'react';
import {SafeAreaView, ScrollView, StyleSheet} from 'react-native';
import {iOSUIKit} from 'react-native-typography';
import packageConfig from '../../package.json';
import Text from '../components/Text';
import {getTranslation} from '../helpers/i18n';
import {INavigationScreen} from '../types';
import {useDarkMode} from 'react-native-dark-mode';
import {getScreenOptions} from '../helpers/navigation';
import {adaptToSystemTheme} from '../helpers/darkmode';

const deps = [
  ...Object.keys(packageConfig.dependencies),
  ...Object.keys(packageConfig.devDependencies),
];

const AcknowledgementsScreen: INavigationScreen<{}> = props => {
  const isDarkMode = useDarkMode();

  useEffect(() => {
    adaptToSystemTheme(props.componentId, isDarkMode, true);
  }, [isDarkMode, props.componentId]);

  return (
    <SafeAreaView
      style={{flex: 1, backgroundColor: isDarkMode ? 'black' : 'white'}}>
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
          {getTranslation('acknowledgeHarryChen')}
        </Text>
        <Text
          style={{
            alignSelf: 'center',
            marginBottom: 20,
            fontSize: iOSUIKit.bodyObject.fontSize,
          }}>
          {getTranslation('acknowledgeYayuXiao')}
        </Text>
        <Text
          style={{
            alignSelf: 'center',
            marginBottom: 20,
            fontSize: iOSUIKit.bodyObject.fontSize,
          }}>
          {getTranslation('acknowledgeJSCommunity')}
        </Text>
        {deps.map((dep, index) => (
          <Text
            key={index}
            style={StyleSheet.compose(
              isDarkMode ? iOSUIKit.footnoteWhite : iOSUIKit.footnote,
              {
                marginTop: 2,
                marginBottom: 2,
              },
            )}>
            {dep}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

AcknowledgementsScreen.options = getScreenOptions(
  getTranslation('acknowledgements'),
);

export default AcknowledgementsScreen;
