module.exports = {
  root: true,
  extends: ['@react-native-community'],
  rules: {
    'no-spaced-func': 'off',
    'no-shadow': 'off',
    'react-native/no-inline-styles': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', {varsIgnorePattern: '_'}],
  },
};
