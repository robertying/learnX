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
};
