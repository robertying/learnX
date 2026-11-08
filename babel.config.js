const path = require('path');

const srcDir = path.join(__dirname, 'src') + path.sep;
const widgetsDir = path.join(srcDir, 'widgets') + path.sep;

// Turns functions with the 'widget' directive into strings that the widget
// runtime evaluates (expo-widgets). Our preset isn't babel-preset-expo, so it's
// added here.
const { widgetsPlugin } = require(
  require.resolve('babel-preset-expo/build/plugins/widgets-plugin', {
    paths: [require.resolve('expo/package.json')],
  }),
);

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Must run first, on the original source. Only app code is compiled, not
    // node_modules.
    [
      'babel-plugin-react-compiler',
      {
        target: '19',
        // Widget layouts are sent as source text, not run as components.
        sources: filename =>
          filename.startsWith(srcDir) && !filename.startsWith(widgetsDir),
      },
    ],
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ts', '.tsx'],
      },
    ],
    'preval',
    '@babel/plugin-transform-export-namespace-from',
    'react-native-paper/babel',
    'react-native-worklets/plugin',
    widgetsPlugin,
  ],
};
