import './polyfills';

import { AppRegistry, LogBox } from 'react-native';
import { name as appName } from './app.json';
import App from './src/App';

LogBox.ignoreAllLogs(true);

AppRegistry.registerComponent(appName, () => App);
