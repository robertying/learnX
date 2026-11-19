import '../common';

// The `web` project's stand-ins: the Electron app's components render with
// React Native Web and Fluent UI into jsdom, so only the native modules the
// shared code they import touches are replaced (jest/common.ts).

// jsdom has no layout: Fluent's positioning and React Native Web's views
// observe sizes that never change.
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.assign(globalThis, { ResizeObserver });

// What src/polyfills.web.js gives React Native Web in the app: Apple's color
// functions as CSS variables, and alerts as Fluent dialogs.
const ReactNativeWeb = require('react-native-web');
const {
  DynamicColorIOS,
  PlatformColor,
} = require('../../src/web/systemColors');
Object.assign(ReactNativeWeb, { DynamicColorIOS, PlatformColor });
ReactNativeWeb.Alert.alert = require('../../src/web/alert').Alert.alert;
