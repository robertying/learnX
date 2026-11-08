import './setupEnv';
import './polyfills';

import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
import App from './src/App';
import {
  installGlobalErrorHandler,
  installRejectionTracker,
} from './src/helpers/crashReporting';
import { setUpNotificationActions } from './src/helpers/notificationActions';

installGlobalErrorHandler();
installRejectionTracker();
// Before the app renders: an action button can launch the app in the
// background, where it may never render.
setUpNotificationActions();

AppRegistry.registerComponent(appName, () => App);
