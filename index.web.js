// The Electron app's entry: the app's own (index.js), then rendered into the
// page's root element, which React Native Web doesn't do by itself, with the
// launch options of a test run as its props (electron/dev.mjs).
import './index.js';
import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';

AppRegistry.runApplication(appName, {
  rootTag: globalThis.document.getElementById('root'),
  initialProps: globalThis.learnx?.launchOptions() ?? {},
});
