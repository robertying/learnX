import {Navigation, Options} from 'react-native-navigation';
import {Platform} from 'react-native';
import Colors from '../constants/Colors';

export const getAndroidTheme = (colorScheme: string) => {
  return {
    layout: {
      backgroundColor: Colors.system('background', colorScheme),
    },
    statusBar: {
      backgroundColor: Colors.system('background', colorScheme),
      style: colorScheme === 'dark' ? 'light' : 'dark',
    },
    topBar: {
      backButton: {
        color: Colors.system('foreground', colorScheme),
      },
      title: {
        color: Colors.system('foreground', colorScheme),
      },
      background: {
        color: Colors.system('background', colorScheme),
      },
    },
    bottomTabs: {
      backgroundColor: Colors.system('background', colorScheme),
    },
  } as Options;
};

export const adaptToSystemTheme = (
  componentId: string,
  colorScheme: string,
) => {
  if (Platform.OS === 'android') {
    Navigation.mergeOptions(componentId, getAndroidTheme(colorScheme));
  } else {
    Navigation.mergeOptions(componentId, {
      window: {
        backgroundColor: colorScheme === 'dark' ? 'black' : 'white',
      },
      layout: {
        backgroundColor: colorScheme === 'dark' ? 'black' : 'white',
      },
    } as any);
  }
};
