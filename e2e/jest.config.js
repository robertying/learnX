module.exports = {
  preset: 'react-native',
  transform: {
    '^.+\\.(js|tsx?)$':
      '<rootDir>/../node_modules/react-native/jest/preprocessor.js',
  },
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/setupTests.ts'],
  reporters: ['detox/runners/jest/streamlineReporter'],
  verbose: true,
};
