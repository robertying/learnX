const path = require('path');

const srcDir = path.join(__dirname, 'src') + path.sep;

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Must run first, on the original source. Only app code is compiled, not
    // node_modules.
    [
      'babel-plugin-react-compiler',
      {
        target: '19',
        sources: filename => filename.startsWith(srcDir),
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
  ],
};
