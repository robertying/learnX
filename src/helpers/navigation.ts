import {Navigation, Options} from 'react-native-navigation';
import {Platform} from 'react-native';
import Colors from '../constants/Colors';
import {getAndroidTheme} from './darkmode';

export function pushTo<T>(
  name: string,
  componentId: string,
  passProps?: T,
  title?: string,
  hideBackTitle?: boolean,
  isDarkMode?: boolean,
) {
  const colorScheme = isDarkMode ? 'dark' : 'light';
  if (Platform.OS === 'android') {
    Navigation.push(componentId, {
      component: {
        name,
        passProps,
        options: {
          ...getAndroidTheme(colorScheme),
          topBar: {
            backButton: {
              color: Colors.system('foreground', colorScheme),
            },
            title: {
              text: title,
              color: Colors.system('foreground', colorScheme),
            },
            background: {
              color: Colors.system('background', colorScheme),
            },
          },
        },
      },
    });
  } else {
    Navigation.push(componentId, {
      component: {
        name,
        passProps,
        options: {
          topBar: {
            backButton: {
              showTitle: !hideBackTitle,
            },
            title: {
              text: title,
            },
          },
        },
      },
    });
  }
}

export function setDetailView<T>(name: string, passProps?: T, title?: string) {
  Navigation.setStackRoot('detail.root', [
    {
      component: {
        name,
        passProps,
        options: {
          topBar: {
            title: {
              text: title,
              fontWeight: 'medium',
              fontSize: 17,
            },
          },
          animations: {
            setStackRoot: {
              enabled: false,
            },
          },
        },
      },
    },
  ]);
}

export const getScreenOptions = (
  title: string,
  searchBarPlaceholder?: string,
) => {
  const options: Options = {
    topBar: {
      title: {
        text: title,
      },
      ...(searchBarPlaceholder && {
        searchBar: true,
        searchBarHiddenWhenScrolling: true,
        searchBarPlaceholder: searchBarPlaceholder,
        hideNavBarOnFocusSearchBar: true,
      }),
      elevation: 0,
    },
    bottomTabs: {
      translucent: true,
      drawBehind: Platform.OS === 'ios',
    },
  };
  return options;
};
