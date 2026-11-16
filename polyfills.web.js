// The Electron app (a web build). The browser has crypto and URL already;
// requests to Tsinghua's servers go through Electron's main process, and
// Apple's color APIs, which the iOS components call as they load, become CSS
// variables (src/web/systemColors), and alerts the system's message boxes
// (src/web/alert). React Native Web's exports object is
// filled in before any component reads from it.
import { alert } from './src/web/alert';
import { installElectronFetch } from './src/web/fetch';
import { DynamicColorIOS, PlatformColor } from './src/web/systemColors';

installElectronFetch();
Object.assign(require('react-native'), { DynamicColorIOS, PlatformColor });
require('react-native').Alert.alert = alert;

import 'react-native-gesture-handler';
