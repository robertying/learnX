import { startTransition, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import type { SFSymbol } from 'sf-symbols-typescript';
import type { DayPart } from 'helpers/dayPart';
import { t } from 'helpers/i18n';
import { systemIcons } from 'helpers/systemIcons';
import { useTheme } from 'theme';
import { MainTabParams } from 'screens/types';
import { useSplitLaidOut } from './NativeSplitView';
import createSidebarSplitNavigator from './SidebarSplitNavigator';
import DeviceInfo from 'constants/DeviceInfo';
import { useDayPart } from 'hooks/useClock';
import useKeyboardShown from 'hooks/useKeyboardShown';
import useMainCommands from 'hooks/useMainCommands';
import useLaunchSheet from 'hooks/useLaunchSheet';
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

type TabIcon =
  | 'notices'
  | 'assignments'
  | 'files'
  | 'courses'
  | 'settings'
  | DayPart;

// The tab bar draws each tab's icon filled, as iOS's own apps do; the Mac's
// sidebar draws the outline (`systemIcons`), as Finder and Mail do.
const filledSymbols: Record<TabIcon, SFSymbol> = {
  notices: 'bell.fill',
  assignments: 'list.bullet.clipboard.fill',
  files: 'folder.fill',
  courses: 'books.vertical.fill',
  settings: 'gearshape.fill',
  morning: 'sunrise.fill',
  afternoon: 'sun.max.fill',
  evening: 'sunset.fill',
  night: 'moon.stars.fill',
};

// Android's navigation bar shows the outlined Material Symbol, and the filled
// one on the selected tab: vector drawables in android/app/src/main/res/drawable
// (`tab_<symbol>` and `tab_<symbol>_filled`, drawn from the Material Symbols
// font), since the bar loads its icons as images.
const getTabBarIcon = (icon: TabIcon, focused: boolean) =>
  Platform.OS === 'ios'
    ? { sfSymbol: filledSymbols[icon] }
    : { uri: `tab_${systemIcons[icon].android}${focused ? '_filled' : ''}` };

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
  /** `dayPart` follows the time of day: sunrise, sun, sunset or moon. */
  icon: TabIcon | 'dayPart';
  testID: string;
}

const tabs: Tab[] = [
  {
    name: 'TodayStack',
    component: withSplit(TodayStack),
    title: t('today'),
    icon: 'dayPart',
    testID: 'tab-today',
  },
  {
    name: 'NoticeStack',
    component: withSplit(NoticeStack),
    title: t('notices'),
    icon: 'notices',
    testID: 'tab-notices',
  },
  {
    name: 'AssignmentStack',
    component: withSplit(AssignmentStack),
    title: t('assignments'),
    icon: 'assignments',
    testID: 'tab-assignments',
  },
  {
    name: 'FileStack',
    component: withSplit(FileStack),
    title: t('files'),
    icon: 'files',
    testID: 'tab-files',
  },
  {
    name: 'CourseStack',
    component: withSplit(CourseStack),
    title: t('courses'),
    icon: 'courses',
    testID: 'tab-courses',
  },
  ...(sidebarSplit
    ? ([
        {
          name: 'SettingStack',
          component: withSplit(SettingStack),
          title: t('settings'),
          icon: 'settings',
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
  useLaunchSheet();
  useMainCommands();
  const part = useDayPart();
  const iconOf = (tab: Tab) => (tab.icon === 'dayPart' ? part : tab.icon);
  // Settings' badge is on its sidebar row on Mac, and on its button in
  // Today's header elsewhere; the tab bar shows none.
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
              sfSymbol: systemIcons[iconOf(tab)].ios,
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
      // Given, so the navigator doesn't blend its own from the theme, which
      // it can't do with system colors: secondaryLabel on iOS, and Material's
      // onSurfaceVariant for an inactive navigation bar item
      tabBarInactiveTintColor={theme.colors.onSurfaceVariant as string}
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
            tabBarIcon: ({ focused }) => getTabBarIcon(iconOf(tab), focused),
          }}
        />
      ))}
    </MainNativeNavigator.Navigator>
  );
};

export default MainTab;
