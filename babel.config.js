module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ts', '.tsx'],
      },
    ],
    'preval',
  ],
  env: {
    production: {
      plugins: ['react-native-paper/babel'],
    },
  },
};
