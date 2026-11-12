import './setupEnv';
import './polyfills';

import { AppRegistry, LogBox } from 'react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/en';
import 'dayjs/locale/zh-cn';
import { isLocaleChinese } from './src/helpers/i18n';
import { name as appName } from './app.json';
import App from './src/App';
import {
  installGlobalErrorHandler,
  installRejectionTracker,
} from './src/services/crashReporting';
import { setUpNotificationActions } from './src/services/notificationActions';
// Defines the background fetch task. A task has to be defined while the bundle
// first runs: a background launch runs only this file, without mounting the
// app. Metro inlines requires, so the import where the task is registered
// (useMainStartup) would load the module only once the app has mounted.
import './src/services/background';
import { watchSurfaces } from './src/services/surfaces';
import { withLaunchOptions } from './src/services/launchOptions';

// Keep LogBox off: its "Open debugger to view warnings" toast covers the tab
// bar and opens a React Native DevTools window when tapped. Read warnings in
// the Metro log instead.
LogBox.ignoreAllLogs(true);

// For every date shown, also by a background launch that never renders.
dayjs.extend(relativeTime);
dayjs.locale(isLocaleChinese() ? 'zh-cn' : 'en');

installGlobalErrorHandler();
installRejectionTracker();
// Before the app renders: an action button can launch the app in the
// background, where it may never render.
setUpNotificationActions();
// Keeps the widgets, reminders, Spotlight and App Intents in step with the
// data, in this runtime whether or not the app renders.
watchSurfaces();

// Test runs set the app up with launch arguments (services/launchOptions).
AppRegistry.registerComponent(appName, () => withLaunchOptions(App));
