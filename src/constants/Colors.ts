import {DynamicColorIOS, Platform} from 'react-native';

const plainTheme = '#9c27b0';

const theme =
  Platform.OS === 'ios'
    ? (DynamicColorIOS({
        light: '#9c27b0',
        dark: '#bb86fc',
      }) as unknown as string)
    : '#9c27b0';

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
