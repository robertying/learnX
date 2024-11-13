import './polyfills';

import {AppRegistry, LogBox, Platform, UIManager} from 'react-native';
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';
import {name as appName} from './app.json';
import App from './src/App';

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

LogBox.ignoreAllLogs(true);

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

AppRegistry.registerComponent(appName, () => App);
