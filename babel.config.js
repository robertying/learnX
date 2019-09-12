module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: ['preval'],
  env: {
    production: {
      plugins: ['transform-remove-console', 'react-native-paper/babel'],
    },
  },
};
