import {Navigation, Options} from 'react-native-navigation';

export function pushTo<T>(
  name: string,
  componentId: string,
  passProps?: T,
  title?: string,
  hideBackTitle?: boolean,
  isDarkMode?: boolean,
) {
  Navigation.push(componentId, {
    component: {
      name,
      passProps,
      options: {
        layout: {
          backgroundColor: isDarkMode ? 'black' : 'white',
        },
        topBar: {
          title: {
            text: title,
            fontWeight: 'medium',
            fontSize: 17,
          },
          backButton: {
            showTitle: !hideBackTitle,
          },
        },
      },
    },
  });
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
          } as any,
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
        fontWeight: 'medium',
        fontSize: 17,
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
      drawBehind: Platform.OS === 'ios' ? true : false,
    },
  };
  return options;
};
