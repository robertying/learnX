import React, {useEffect} from 'react';
import {SafeAreaView, ScrollView, StyleSheet, Text} from 'react-native';
import {iOSUIKit} from 'react-native-typography';
import packageConfig from '../../package.json';
import {getTranslation} from '../helpers/i18n';
import {INavigationScreen} from '../types';
import {getScreenOptions} from '../helpers/navigation';
import {adaptToSystemTheme} from '../helpers/darkmode';
import {useColorScheme} from 'react-native-appearance';
import Colors from '../constants/Colors';

const deps = [
  ...Object.keys(packageConfig.dependencies),
  ...Object.keys(packageConfig.devDependencies),
];

const styles = StyleSheet.create({
  center: {
    alignSelf: 'center',
    marginBottom: 20,
  },
});

const AcknowledgementsScreen: INavigationScreen<{}> = props => {
  const colorScheme = useColorScheme();

  useEffect(() => {
    adaptToSystemTheme(props.componentId, colorScheme, true);
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
          {getTranslation('acknowledgeHarryChen')}
        </Text>
        <Text
          style={[
            styles.center,
            {
              fontSize: iOSUIKit.bodyObject.fontSize,
              color: Colors.system('foreground', colorScheme),
            },
          ]}>
          {getTranslation('acknowledgeYayuXiao')}
        </Text>
        <Text
          style={[
            styles.center,
            {
              fontSize: iOSUIKit.bodyObject.fontSize,
              color: Colors.system('foreground', colorScheme),
            },
          ]}>
          {getTranslation('acknowledgeJSCommunity')}
        </Text>
        {deps.map((dep, index) => (
          <Text
            key={index}
            style={[
              colorScheme === 'dark'
                ? iOSUIKit.footnoteWhite
                : iOSUIKit.footnote,
              {
                alignSelf: 'center',
                marginTop: 2,
                marginBottom: 2,
              },
            ]}>
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
