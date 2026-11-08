import './setupEnv';
import './polyfills';

import { AppRegistry, LogBox } from 'react-native';
import { name as appName } from './app.json';
import App from './src/App';
import { installGlobalErrorHandler } from './src/helpers/crashReporting';

LogBox.ignoreAllLogs(true);
installGlobalErrorHandler();

AppRegistry.registerComponent(appName, () => App);
