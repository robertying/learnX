import {DynamicColorIOS, Platform} from 'react-native';

const plainTheme = '#9A25AE';

const theme =
  Platform.OS === 'ios'
    ? (DynamicColorIOS({
        light: '#9A25AE',
        dark: '#F9ABFF',
      }) as unknown as string)
    : '#9A25AE';

export default {
  plainTheme,
  theme,
  red500: '#f44336',
  blue500: '#2196f3',
  green500: '#4caf50',
  orange500: '#ff9800',
  yellow500: '#ffeb3b',
  grey500: '#9e9e9e',
};
