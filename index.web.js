// The Electron app's entry: the app's own (index.js), registered again inside
// Fluent's theme (src/web/FluentRoot), then rendered into the page's root
// element, which React Native Web doesn't do by itself, with the launch
// options of a test run as its props (electron/dev.mjs).
import './index.js';
import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
import App from './src/App';
import { withLaunchOptions } from './src/services/launchOptions';
import FluentRoot from './src/web/FluentRoot';

const LaunchedApp = withLaunchOptions(App);

AppRegistry.registerComponent(appName, () => props => (
  <FluentRoot>
    <LaunchedApp {...props} />
  </FluentRoot>
));
AppRegistry.runApplication(appName, {
  rootTag: globalThis.document.getElementById('root'),
  initialProps: globalThis.learnx?.launchOptions() ?? {},
});
