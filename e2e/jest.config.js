module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/setupTests.ts'],
  reporters: ['detox/runners/jest/streamlineReporter'],
  verbose: true,
};
