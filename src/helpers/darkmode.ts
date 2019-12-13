import {Navigation} from 'react-native-navigation';
import {Platform} from 'react-native';

export const adaptToSystemTheme = (
  componentId: string,
  isDarkMode: boolean,
  hasBackButton?: boolean,
) => {
  if (Platform.OS === 'android') {
    Navigation.mergeOptions(componentId, {
      layout: {
        backgroundColor: isDarkMode ? 'black' : 'white',
      },
      statusBar: {
        backgroundColor: isDarkMode ? 'black' : 'white',
        style: isDarkMode ? 'light' : 'dark',
      },
      topBar: {
        backButton: hasBackButton
          ? {
              color: isDarkMode ? 'white' : 'black',
            }
          : undefined,
        title: {
          color: isDarkMode ? 'white' : 'black',
        },
        background: {
          color: isDarkMode ? 'black' : 'white',
        },
      },
      bottomTabs: {
        backgroundColor: isDarkMode ? 'black' : 'white',
      },
    });
  } else {
    Navigation.mergeOptions(componentId, {
      statusBar: {
        style: isDarkMode ? 'light' : 'dark',
      },
    });
  }
};
