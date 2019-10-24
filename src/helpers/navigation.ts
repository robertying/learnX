import {Navigation, Options} from 'react-native-navigation';

export function pushTo<T>(
  name: string,
  componentId: string,
  passProps?: T,
  title?: string,
) {
  Navigation.push(componentId, {
    component: {
      name,
      passProps,
      options: {
        topBar: {
          title: {
            text: title,
            fontWeight: 'medium',
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
      },
      largeTitle: {
        visible: false,
      },
      ...(searchBarPlaceholder && {
        searchBar: true,
        searchBarHiddenWhenScrolling: true,
        searchBarPlaceholder: searchBarPlaceholder,
        hideNavBarOnFocusSearchBar: true,
      }),
      elevation: 0,
    },
  };
  return options;
};
