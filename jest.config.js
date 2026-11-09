// Fixed time zone so date formatting is the same on every machine
process.env.TZ = 'Asia/Shanghai';

/** @type {import('jest').Config} */
module.exports = {
  preset: '@react-native/jest-preset',
  roots: ['<rootDir>/src'],
  // Loads Reanimated's and Worklets' web builds instead of the native ones
  resolver: 'react-native-reanimated/jest/resolver',
  setupFiles: ['<rootDir>/jest/setup.ts'],
  transform: {
    '^.+\\.mjs$': 'babel-jest',
  },
  transformIgnorePatterns: [
    // React Native libraries (react-native-*, @react-native-*), React
    // Navigation, thu-learn-lib (and some of its dependencies) and mime ship
    // ESM or untranspiled source, so they go through Babel (entities is nested
    // under thu-learn-lib, newer and ESM-only; he resolves to its .mjs build)
    'node_modules/(?!((jest-)?react-native[^/]*|@react-native[^/]*|@react-navigation|@robertying/thu-learn-lib|node-fetch-native|fetch-cookie|entities|mime|he)/)',
  ],
};
