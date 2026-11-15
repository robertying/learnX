const path = require('path');

// Keeps React Native's own fetch as the global fetch (setupEnv.ts says why).
// In release bundles babel-preset-expo inlines EXPO_PUBLIC_* variables from the
// environment Babel runs in, so the app setting it at runtime is too late
// there: the flag must be set here as well. Without it, a release build installs
// expo/fetch, which threw on a FormData body (the SSO login's) in release
// builds.
process.env.EXPO_PUBLIC_USE_RN_FETCH = '1';

const srcDir = path.join(__dirname, 'src') + path.sep;
const widgetsDir = path.join(srcDir, 'widgets') + path.sep;

// babel-preset-expo inlines process.env.EXPO_OS and adds the Worklets,
// expo-widgets and @expo/ui plugins on its own. It only adds the React Compiler
// when app.json turns on `experiments.reactCompiler`, which we leave off, so the
// compiler is added here.
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
        // The local Expo modules sit next to src/, not in it; tests import the
        // helpers, mocks and fixtures in jest/ as test-utils/…
        alias: { modules: './modules', 'test-utils': './jest' },
        extensions: ['.ts', '.tsx'],
      },
    ],
    // Inlines the allowed .env keys into src/helpers/env.ts.
    './babel/inline-env',
    'preval',
  ],
};
