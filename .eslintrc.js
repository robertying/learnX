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
        'react/jsx-uses-react': 'off',
        'react/react-in-jsx-scope': 'off',
        'react-native/no-inline-styles': 'off',
      },
    },
  ],
};
