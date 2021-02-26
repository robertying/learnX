module.exports = {
  root: true,
  extends: '@react-native-community',
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    'comma-dangle': 'off',
    'no-spaced-func': 'off',
    'no-shadow': 'off',
    'react-native/no-inline-styles': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', {varsIgnorePattern: '_'}],
  },
};
