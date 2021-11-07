module.exports = {
  root: true,
  extends: '@react-native-community',
  globals: {
    React: 'readonly',
  },
  rules: {
    'no-spaced-func': 'off',
    'no-shadow': 'off',
    'react/jsx-uses-react': 'off',
    'react/react-in-jsx-scope': 'off',
    'react-native/no-inline-styles': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', {varsIgnorePattern: '_'}],
  },
};
