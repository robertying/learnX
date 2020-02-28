import {LayoutBottomTabs, LayoutRoot} from 'react-native-navigation';
import Colors from '../constants/Colors';
import {getTranslation} from '../helpers/i18n';
import {loadIcons} from '../helpers/icons';
import {Appearance} from 'react-native-appearance';
import DeviceInfo from '../constants/DeviceInfo';

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

const colorScheme = Appearance.getColorScheme();
const tabIconDefaultColor = Colors.system('gray', colorScheme);
const tabIconSelectedColor = Colors.system('purple', colorScheme);

const tabColorSettings = {
  textColor: tabIconDefaultColor,
  selectedTextColor: tabIconSelectedColor,
  iconColor: tabIconDefaultColor,
  selectedIconColor: tabIconSelectedColor,
};

export const getNavigationRoot = async () => {
  const icons = await loadIcons();

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
              testID: 'NoticeTab',
              text: getTranslation('notices'),
              icon: icons
                ? icons.notifications
                : ({
                    uri: 'notifications',
                  } as any),
              ...tabColorSettings,
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
              testID: 'FileTab',
              text: getTranslation('files'),
              icon: icons
                ? icons.folder
                : ({
                    uri: 'folder',
                  } as any),
              ...tabColorSettings,
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
              testID: 'AssignmentTab',
              text: getTranslation('assignments'),
              icon: icons
                ? icons.today
                : ({
                    uri: 'today',
                  } as any),
              ...tabColorSettings,
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
              },
            },
          ],
          options: {
            bottomTab: {
              testID: 'CourseTab',
              text: getTranslation('courses'),
              icon: icons
                ? icons.apps
                : ({
                    uri: 'apps',
                  } as any),
              ...tabColorSettings,
            },
          },
        },
      },
      {
        stack: {
          children: [
            {
              component: {
                id: 'SettingsScreen',
                name: 'settings.index',
              },
            },
          ],
          options: {
            bottomTab: {
              testID: 'SettingTab',
              text: getTranslation('settings'),
              icon: icons
                ? icons.settings
                : ({
                    uri: 'settings',
                  } as any),
              ...tabColorSettings,
            },
          },
        },
      },
    ],
  };

  const navigationRoot: LayoutRoot = DeviceInfo.isIPad()
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
                maxWidth: DeviceInfo.isMac() ? 1000 : undefined,
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
