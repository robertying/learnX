import {Navigation, Options} from 'react-native-navigation';
import {Platform} from 'react-native';
import Colors from '../constants/Colors';
import {getAndroidTheme} from './darkmode';
import DeviceInfo from '../constants/DeviceInfo';

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
            },
          },
          animations: {
            push: {
              content: {
                waitForRender: true,
                alpha: {
                  from: 0,
                  to: 1,
                  duration: 250,
                },
              },
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
  hasRefreshButton?: boolean,
) => {
  const options: Options = {
    topBar: {
      title: {
        text: title,
      },
      ...(searchBarPlaceholder && {
        searchBar: true,
        searchBarHiddenWhenScrolling: true,
        // searchBarPlaceholder: searchBarPlaceholder,
        hideNavBarOnFocusSearchBar: true,
      }),
      elevation: 0,
      leftButtons:
        hasRefreshButton && DeviceInfo.isMac()
          ? [
              {
                id: 'refresh',
                systemItem: 'refresh',
              },
            ]
          : undefined,
    },
  };
  return options;
};
