module.exports = {
  root: true,
  extends: '@react-native-community',
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        'no-spaced-func': 'off',
        'no-shadow': 'off',
        'no-undef': 'off',
        '@typescript-eslint/no-unused-vars': ['warn', {varsIgnorePattern: '_'}],
        '@typescript-eslint/no-shadow': 'off',
        'react/jsx-uses-react': 'off',
        'react/react-in-jsx-scope': 'off',
        'react/no-unstable-nested-components': ['warn', {allowAsProps: true}],
        'react-native/no-inline-styles': 'off',
      },
    },
  ],
};
