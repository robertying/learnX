module.exports = {
  root: true,
  env: {
    jest: true,
    jasmine: true,
  },
  extends: '@react-native-community',
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    'react-native/no-inline-styles': 'off',
    'no-shadow': 'off',
  },
};
