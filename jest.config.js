// Fixed time zone so date formatting is the same on every machine
process.env.TZ = 'Asia/Shanghai';

/** @type {import('jest').Config} */
const base = {
  preset: '@react-native/jest-preset',
  roots: ['<rootDir>/src'],
  // Loads Reanimated's and Worklets' web builds instead of the native ones
  resolver: 'react-native-reanimated/jest/resolver',
  setupFiles: ['<rootDir>/jest/setup.ts'],
  // Every test starts with fresh call records on every mock.
  clearMocks: true,
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

/**
 * Two runs: everything with each split component's iOS file (Jest's default
 * platform here), and the component tests under `__tests__/android` with the
 * `.android.tsx` files, Compose stand-ins (`jest/mocks/expoCompose.tsx`) and
 * `Platform.OS` 'android'.
 */
/** @type {import('jest').Config} */
module.exports = {
  // Count every source file, not only the ones some test imports.
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/*.d.ts',
  ],
  projects: [
    {
      ...base,
      displayName: 'ios',
      testPathIgnorePatterns: ['/node_modules/', '/__tests__/android/'],
    },
    {
      ...base,
      displayName: 'android',
      haste: {
        defaultPlatform: 'android',
        platforms: ['android', 'ios', 'native'],
      },
      setupFiles: [...base.setupFiles, '<rootDir>/jest/android.ts'],
      // Material Symbols, which Compose draws from vector drawables
      moduleNameMapper: { '\\.xml$': '<rootDir>/jest/mocks/drawable.ts' },
      testMatch: ['<rootDir>/src/**/__tests__/android/**/*.test.ts?(x)'],
    },
  ],
};
