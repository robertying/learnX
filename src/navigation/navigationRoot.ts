import {LayoutBottomTabs, LayoutRoot} from 'react-native-navigation';
import Colors from '../constants/Colors';
import DeviceInfo from '../constants/DeviceInfo';
import {getTranslation} from '../helpers/i18n';
import {loadTabIcons} from '../helpers/icons';
import {initialMode} from 'react-native-dark-mode';

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

const tabIconDefaultColor =
  initialMode === 'dark' ? Colors.grayDark : Colors.grayLight;
const tabIconSelectedColor =
  initialMode === 'dark' ? Colors.purpleDark : Colors.theme;

export const getNavigationRoot = async () => {
  const icons = await loadTabIcons();
  await DeviceInfo.init();

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
            layout: {
              backgroundColor: initialMode === 'dark' ? 'black' : 'white',
            },
            bottomTab: {
              testID: 'NoticeTab',
              text: getTranslation('notices'),
              textColor: tabIconDefaultColor,
              selectedTextColor: tabIconSelectedColor,
              icon: icons.notifications,
              iconColor: tabIconDefaultColor,
              selectedIconColor: tabIconSelectedColor,
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
            layout: {
              backgroundColor: initialMode === 'dark' ? 'black' : 'white',
            },
            bottomTab: {
              testID: 'FileTab',
              text: getTranslation('files'),
              textColor: tabIconDefaultColor,
              selectedTextColor: tabIconSelectedColor,
              icon: icons.folder,
              iconColor: tabIconDefaultColor,
              selectedIconColor: tabIconSelectedColor,
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
            layout: {
              backgroundColor: initialMode === 'dark' ? 'black' : 'white',
            },
            bottomTab: {
              testID: 'AssignmentTab',
              text: getTranslation('assignments'),
              textColor: tabIconDefaultColor,
              selectedTextColor: tabIconSelectedColor,
              icon: icons.today,
              iconColor: tabIconDefaultColor,
              selectedIconColor: tabIconSelectedColor,
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
            layout: {
              backgroundColor: initialMode === 'dark' ? 'black' : 'white',
            },
            bottomTab: {
              testID: 'CourseTab',
              text: getTranslation('courses'),
              textColor: tabIconDefaultColor,
              selectedTextColor: tabIconSelectedColor,
              icon: icons.apps,
              iconColor: tabIconDefaultColor,
              selectedIconColor: tabIconSelectedColor,
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
            layout: {
              backgroundColor: initialMode === 'dark' ? 'black' : 'white',
            },
            bottomTab: {
              testID: 'SettingTab',
              text: getTranslation('settings'),
              textColor: tabIconDefaultColor,
              selectedTextColor: tabIconSelectedColor,
              icon: icons.settings,
              iconColor: tabIconDefaultColor,
              selectedIconColor: tabIconSelectedColor,
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
                      options: {
                        layout: {
                          backgroundColor:
                            initialMode === 'dark' ? 'black' : 'white',
                        },
                      },
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
