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
// Defines the background fetch task. A task has to be defined while the bundle
// first runs: a background launch runs only this file, without mounting the
// app. Metro inlines requires, so the import where the task is registered
// (useMainStartup) would load the module only once the app has mounted.
import './src/helpers/background';
import { watchSurfaces } from './src/helpers/surfaces';

// Keep LogBox off: its "Open debugger to view warnings" toast covers the tab
// bar and opens a React Native DevTools window when tapped. Read warnings in
// the Metro log instead.
LogBox.ignoreAllLogs(true);

installGlobalErrorHandler();
installRejectionTracker();
// Before the app renders: an action button can launch the app in the
// background, where it may never render.
setUpNotificationActions();
// Keeps the widgets, reminders, Spotlight and App Intents in step with the
// data, in this runtime whether or not the app renders.
watchSurfaces();

AppRegistry.registerComponent(appName, () => App);
