// The Electron app (a web build). The browser has crypto and URL already;
// requests to Tsinghua's servers go through Electron's main process, and
// Apple's color APIs, which the iOS components call as they load, become CSS
// variables (src/web/systemColors); alerts, which React Native Web leaves
// out, are Fluent dialogs (src/web/alert). React Native Web's exports object is
// filled in before any component reads from it.
import { installElectronFetch } from './web/fetch';
import { Alert } from './web/alert';
import { DynamicColorIOS, PlatformColor } from './web/systemColors';

installElectronFetch();
const ReactNative = require('react-native');
Object.assign(ReactNative, { DynamicColorIOS, PlatformColor });
// React Native Web exports its own (empty) Alert, read-only, so its method is
// what's replaced.
ReactNative.Alert.alert = Alert.alert;

import 'react-native-gesture-handler';
