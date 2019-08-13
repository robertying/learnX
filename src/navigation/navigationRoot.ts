import {LayoutBottomTabs, LayoutRoot} from 'react-native-navigation';
import Colors from '../constants/Colors';
import DeviceInfo from '../constants/DeviceInfo';
import {getTranslation} from '../helpers/i18n';
import {loadTabIcons} from '../helpers/icons';

export const getAuthLoadingRoot = () => {
  const authLoadingRoot: LayoutRoot = {
    root: {
      component: {
        name: 'auth.loading',
      },
    },
  };
  return authLoadingRoot;
};

export const getNavigationRoot = async () => {
  const icons = await loadTabIcons();

  const bottomTabs: LayoutBottomTabs = {
    children: [
      {
        stack: {
          children: [
            {
              component: {
                name: 'notices.index',
              },
            },
          ],
          options: {
            bottomTab: {
              text: getTranslation('notices'),
              textColor: Colors.tabIconDefault,
              selectedTextColor: Colors.tabIconSelected,
              icon: icons.notifications,
              iconColor: Colors.tabIconDefault,
              selectedIconColor: Colors.tabIconSelected,
            },
          },
        },
      },
      {
        stack: {
          children: [
            {
              component: {
                name: 'files.index',
              },
            },
          ],
          options: {
            bottomTab: {
              text: getTranslation('files'),
              textColor: Colors.tabIconDefault,
              selectedTextColor: Colors.tabIconSelected,
              icon: icons.folder,
              iconColor: Colors.tabIconDefault,
              selectedIconColor: Colors.tabIconSelected,
            },
          },
        },
      },
      {
        stack: {
          children: [
            {
              component: {
                name: 'assignments.index',
              },
            },
          ],
          options: {
            bottomTab: {
              text: getTranslation('assignments'),
              textColor: Colors.tabIconDefault,
              selectedTextColor: Colors.tabIconSelected,
              icon: icons.today,
              iconColor: Colors.tabIconDefault,
              selectedIconColor: Colors.tabIconSelected,
            },
          },
        },
      },
      {
        stack: {
          children: [
            {
              component: {
                name: 'courses.index',
                options: {
                  topBar: {
                    rightButtons: [
                      {
                        id: 'settings',
                        icon: icons.settings,
                      },
                    ],
                  },
                },
              },
            },
          ],
          options: {
            bottomTab: {
              text: getTranslation('courses'),
              textColor: Colors.tabIconDefault,
              selectedTextColor: Colors.tabIconSelected,
              icon: icons.apps,
              iconColor: Colors.tabIconDefault,
              selectedIconColor: Colors.tabIconSelected,
            },
          },
        },
      },
    ],
  };

  const navigationRoot: LayoutRoot = DeviceInfo.isIPad
    ? {
        root: {
          splitView: {
            master: {
              bottomTabs,
            },
            detail: {
              stack: {
                id: 'detail.root',
                children: [
                  {
                    component: {
                      name: 'empty',
                    },
                  },
                ],
              },
            },
            options: {
              splitView: {
                displayMode: 'visible',
                primaryEdge: 'leading',
              },
            },
          },
        },
      }
    : {
        root: {
          bottomTabs,
        },
      };

  return navigationRoot;
};
