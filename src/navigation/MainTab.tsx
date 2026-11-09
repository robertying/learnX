import { startTransition, useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import type { AppleIcon } from 'react-native-bottom-tabs';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { t } from 'helpers/i18n';
import { useTheme } from 'theme';
import { MainTabParams } from 'screens/types';
import { useSplitLaidOut } from './NativeSplitView';
import createSidebarSplitNavigator from './SidebarSplitNavigator';
import DeviceInfo from 'constants/DeviceInfo';
import useKeyboardShown from 'hooks/useKeyboardShown';
import useMainCommands from 'hooks/useMainCommands';
import useMainStartup from 'hooks/useMainStartup';
import useSettingsBadge from 'hooks/useSettingsBadge';
import { renderDetailContainer, TabSplit } from './DetailStack';
import { nativeSplit, sidebarSplit } from './layout';
import {
  AssignmentStack,
  CourseStack,
  FileStack,
  NoticeStack,
  SettingStack,
  TodayStack,
} from './stacks';

const MainNativeNavigator = createNativeBottomTabNavigator<MainTabParams>();
const MainSidebarNavigator = createSidebarSplitNavigator<MainTabParams>();

const getTabBarIcon = (
  sfSymbol: AppleIcon['sfSymbol'],
  materialIcon: ComponentProps<typeof MaterialCommunityIcons>['name'],
) =>
  Platform.OS === 'ios'
    ? { sfSymbol }
    : MaterialCommunityIcons.getImageSourceSync(materialIcon, 24)!;

// UIKit only moves the tab bar into the vertical bar when the tab bar controller
// contains the split view, so each tab gets its own split.
const withSplit = (Master: React.ComponentType) =>
  nativeSplit && !sidebarSplit
    ? () => (
        <TabSplit>
          <Master />
        </TabSplit>
      )
    : Master;

// Today, Notices, Assignments, Files, Courses, and on Mac Settings. Elsewhere
// Settings open from Today's header: Android's navigation bar holds at most
// five tabs, and iPhone moves a sixth into "More". The first one mounts with
// the app, the rest one by one after it (`useMountedTabCount`).
interface Tab {
  name: keyof MainTabParams;
  component: React.ComponentType;
  title: string;
  sfSymbol: AppleIcon['sfSymbol'];
  materialIcon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  testID: string;
}

const tabs: Tab[] = [
  {
    name: 'TodayStack',
    component: withSplit(TodayStack),
    title: t('today'),
    sfSymbol: 'sun.max.fill',
    materialIcon: 'calendar-today',
    testID: 'tab-today',
  },
  {
    name: 'NoticeStack',
    component: withSplit(NoticeStack),
    title: t('notices'),
    sfSymbol: 'bell.fill',
    materialIcon: 'bell',
    testID: 'tab-notices',
  },
  {
    name: 'AssignmentStack',
    component: withSplit(AssignmentStack),
    title: t('assignments'),
    sfSymbol: 'list.bullet.clipboard.fill',
    materialIcon: 'calendar',
    testID: 'tab-assignments',
  },
  {
    name: 'FileStack',
    component: withSplit(FileStack),
    title: t('files'),
    sfSymbol: 'doc.fill',
    materialIcon: 'folder',
    testID: 'tab-files',
  },
  {
    name: 'CourseStack',
    component: withSplit(CourseStack),
    title: t('courses'),
    sfSymbol: 'square.grid.3x3.fill',
    materialIcon: 'apps',
    testID: 'tab-courses',
  },
  ...(sidebarSplit
    ? ([
        {
          name: 'SettingStack',
          component: withSplit(SettingStack),
          title: t('settings'),
          sfSymbol: 'gearshape.fill',
          materialIcon: 'cog',
          testID: 'tab-settings',
        },
      ] satisfies Tab[])
    : []),
];
const mainTabCount = tabs.length;

// A tab that only mounts once it's selected shows up empty first. Mounting them
// all with the first one would delay it, so the rest follow once it has settled,
// one at a time while idle, in renders that give way to anything the user does.
const useMountedTabCount = () => {
  const [count, setCount] = useState(1);
  const splitLaidOut = useSplitLaidOut();

  useEffect(() => {
    if (count >= mainTabCount || (nativeSplit && !splitLaidOut)) {
      return;
    }

    const handle = requestIdleCallback(
      () => startTransition(() => setCount(c => c + 1)),
      { timeout: 2000 },
    );
    return () => cancelIdleCallback(handle);
  }, [count, splitLaidOut]);

  return count;
};

const MainTab = () => {
  const theme = useTheme();
  const mountedTabCount = useMountedTabCount();
  // The window resizes for the keyboard on Android (adjustResize), which would
  // lift the bottom navigation bar on top of it. Material hides it instead.
  const keyboardShown = useKeyboardShown();
  useMainStartup();
  useMainCommands();
  const settingsBadge = useSettingsBadge();

  if (sidebarSplit) {
    return (
      <MainSidebarNavigator.Navigator renderDetail={renderDetailContainer}>
        {tabs.map((tab, index) => (
          <MainSidebarNavigator.Screen
            key={tab.name}
            name={tab.name}
            component={tab.component}
            options={{
              lazy: mountedTabCount <= index,
              title: tab.title,
              sfSymbol: tab.sfSymbol,
              badge: tab.name === 'SettingStack' && settingsBadge,
            }}
          />
        ))}
      </MainSidebarNavigator.Navigator>
    );
  }

  return (
    <MainNativeNavigator.Navigator
      labeled
      sidebarAdaptable={DeviceInfo.isIPad()}
      // Material's baseline otherwise, which doesn't match the headers
      tabBarStyle={
        Platform.OS === 'android'
          ? { backgroundColor: theme.colors.card }
          : undefined
      }
      tabBarHidden={keyboardShown}
    >
      {tabs.map((tab, index) => (
        <MainNativeNavigator.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            lazy: mountedTabCount <= index,
            title: tab.title,
            tabBarButtonTestID: tab.testID,
            tabBarIcon: () => getTabBarIcon(tab.sfSymbol, tab.materialIcon),
            // Settings open from Today's header, so Today carries their badge.
            tabBarBadge:
              tab.name === 'TodayStack' && settingsBadge ? ' ' : undefined,
          }}
        />
      ))}
    </MainNativeNavigator.Navigator>
  );
};

export default MainTab;
