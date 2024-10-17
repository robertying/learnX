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
    'react-native-paper/babel',
    'react-native-reanimated/plugin',
  ],
};
