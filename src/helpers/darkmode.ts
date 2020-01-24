import {Navigation} from 'react-native-navigation';
import {Platform} from 'react-native';
import Colors from '../constants/Colors';

export const adaptToSystemTheme = (
  componentId: string,
  colorScheme: string,
  hasBackButton?: boolean,
) => {
  if (Platform.OS === 'android') {
    Navigation.mergeOptions(componentId, {
      layout: {
        backgroundColor: Colors.system('background', colorScheme),
      },
      statusBar: {
        backgroundColor: Colors.system('background', colorScheme),
        style: colorScheme === 'dark' ? 'light' : 'dark',
      },
      topBar: {
        backButton: hasBackButton
          ? {
              color: Colors.system('foreground', colorScheme),
            }
          : undefined,
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
    });
  } else {
    Navigation.mergeOptions(componentId, {
      statusBar: {
        style: colorScheme === 'dark' ? 'light' : 'dark',
      },
    });
  }
};
