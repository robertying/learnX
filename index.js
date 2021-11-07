import {AppRegistry, Platform, UIManager} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

AppRegistry.registerComponent(appName, () => App);
