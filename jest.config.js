// Fixed time zone so date formatting is the same on every machine
process.env.TZ = 'Asia/Shanghai';

/** @type {import('jest').Config} */
module.exports = {
  preset: '@react-native/jest-preset',
  roots: ['<rootDir>/src'],
  setupFiles: ['<rootDir>/jest/setup.ts'],
  transform: {
    '^.+\\.mjs$': 'babel-jest',
  },
  transformIgnorePatterns: [
    // thu-learn-lib and some of its dependencies ship ESM only, so they go
    // through Babel like the React Native packages (entities is nested under
    // thu-learn-lib, newer and ESM-only)
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|thu-learn-lib|node-fetch-native|fetch-cookie|entities)/)',
  ],
};
