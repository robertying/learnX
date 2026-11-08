import './setupEnv';
import './polyfills';

import { AppRegistry, LogBox } from 'react-native';
import { name as appName } from './app.json';
import App from './src/App';
import {
  installGlobalErrorHandler,
  installRejectionTracker,
} from './src/helpers/crashReporting';
import { setUpNotificationActions } from './src/helpers/notificationActions';

// Keep LogBox off: its "Open debugger to view warnings" toast covers the tab
// bar and opens a React Native DevTools window when tapped. Read warnings in
// the Metro log instead.
LogBox.ignoreAllLogs(true);

installGlobalErrorHandler();
installRejectionTracker();
// Before the app renders: an action button can launch the app in the
// background, where it may never render.
setUpNotificationActions();

AppRegistry.registerComponent(appName, () => App);
