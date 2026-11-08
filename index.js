import './setupEnv';
import './polyfills';

import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
import App from './src/App';
import {
  installGlobalErrorHandler,
  installRejectionTracker,
} from './src/helpers/crashReporting';

installGlobalErrorHandler();
installRejectionTracker();

AppRegistry.registerComponent(appName, () => App);
