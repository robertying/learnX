const path = require('path');

const srcDir = path.join(__dirname, 'src') + path.sep;
const widgetsDir = path.join(srcDir, 'widgets') + path.sep;

// babel-preset-expo inlines process.env.EXPO_OS and adds the Worklets,
// expo-widgets and @expo/ui plugins on its own. It only adds the React Compiler
// under Expo's Metro config, which we don't use, so the compiler is added here.
module.exports = {
  presets: ['babel-preset-expo'],
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
    // Inlines the allowed .env keys into src/helpers/env.ts.
    './babel/inline-env',
    'preval',
  ],
};
