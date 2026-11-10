import { View } from 'react-native';

// react-native-screens' native SafeAreaView, as a plain view. The rest
// (Split) is the real module; tests of split layouts mock NativeSplitView.
// CommonJS, so the whole object (spread or Proxy) is the module.
declare const module: { exports: unknown };
module.exports = {
  ...jest.requireActual('react-native-screens/experimental'),
  SafeAreaView: View,
};
