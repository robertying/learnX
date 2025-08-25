module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ts', '.tsx'],
      },
    ],
    'preval',
    '@babel/plugin-transform-export-namespace-from',
    'react-native-paper/babel',
    'react-native-worklets/plugin',
  ],
};
