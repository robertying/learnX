import {Navigation} from 'react-native-navigation';
import {Platform} from 'react-native';

export const androidAdaptToSystemTheme = (
  componentId: string,
  isDarkMode: boolean,
  hasBackButton?: boolean,
) => {
  if (Platform.OS === 'android') {
    Navigation.mergeOptions(componentId, {
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
  }
};
