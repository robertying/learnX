import { startTransition, useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import type { AppleIcon } from 'react-native-bottom-tabs';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { t } from 'helpers/i18n';
import { useTheme } from 'theme';
import { MainTabParams } from 'screens/types';
import { useSplitLaidOut } from 'components/NativeSplitView';
import createSidebarSplitNavigator from 'components/SidebarSplitNavigator';
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
const TodayTab = withSplit(TodayStack);
const NoticeTab = withSplit(NoticeStack);
const AssignmentTab = withSplit(AssignmentStack);
const FileTab = withSplit(FileStack);
const CourseTab = withSplit(CourseStack);
const SettingTab = withSplit(SettingStack);

// Today, Notices, Assignments, Files, Courses, and on Mac Settings. Elsewhere
// Settings open from Today's header: Android's navigation bar holds at most
// five tabs, and iPhone moves a sixth into "More".
const mainTabCount = sidebarSplit ? 6 : 5;

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
        <MainSidebarNavigator.Screen
          name="TodayStack"
          component={TodayTab}
          options={{ title: t('today'), sfSymbol: 'sun.max.fill' }}
        />
        <MainSidebarNavigator.Screen
          name="NoticeStack"
          component={NoticeTab}
          options={{
            lazy: mountedTabCount <= 1,
            title: t('notices'),
            sfSymbol: 'bell.fill',
          }}
        />
        <MainSidebarNavigator.Screen
          name="AssignmentStack"
          component={AssignmentTab}
          options={{
            lazy: mountedTabCount <= 2,
            title: t('assignments'),
            sfSymbol: 'list.bullet.clipboard.fill',
          }}
        />
        <MainSidebarNavigator.Screen
          name="FileStack"
          component={FileTab}
          options={{
            lazy: mountedTabCount <= 3,
            title: t('files'),
            sfSymbol: 'doc.fill',
          }}
        />
        <MainSidebarNavigator.Screen
          name="CourseStack"
          component={CourseTab}
          options={{
            lazy: mountedTabCount <= 4,
            title: t('courses'),
            sfSymbol: 'square.grid.3x3.fill',
          }}
        />
        <MainSidebarNavigator.Screen
          name="SettingStack"
          component={SettingTab}
          options={{
            lazy: mountedTabCount <= 5,
            title: t('settings'),
            sfSymbol: 'gearshape.fill',
            badge: settingsBadge,
          }}
        />
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
      <MainNativeNavigator.Screen
        name="TodayStack"
        component={TodayTab}
        options={{
          title: t('today'),
          tabBarButtonTestID: 'tab-today',
          tabBarIcon: () => getTabBarIcon('sun.max.fill', 'calendar-today'),
          tabBarBadge: settingsBadge ? ' ' : undefined,
        }}
      />
      <MainNativeNavigator.Screen
        name="NoticeStack"
        component={NoticeTab}
        options={{
          lazy: mountedTabCount <= 1,
          title: t('notices'),
          tabBarButtonTestID: 'tab-notices',
          tabBarIcon: () => getTabBarIcon('bell.fill', 'bell'),
        }}
      />
      <MainNativeNavigator.Screen
        name="AssignmentStack"
        component={AssignmentTab}
        options={{
          lazy: mountedTabCount <= 2,
          title: t('assignments'),
          tabBarButtonTestID: 'tab-assignments',
          tabBarIcon: () =>
            getTabBarIcon('list.bullet.clipboard.fill', 'calendar'),
        }}
      />
      <MainNativeNavigator.Screen
        name="FileStack"
        component={FileTab}
        options={{
          lazy: mountedTabCount <= 3,
          title: t('files'),
          tabBarButtonTestID: 'tab-files',
          tabBarIcon: () => getTabBarIcon('doc.fill', 'folder'),
        }}
      />
      <MainNativeNavigator.Screen
        name="CourseStack"
        component={CourseTab}
        options={{
          lazy: mountedTabCount <= 4,
          title: t('courses'),
          tabBarButtonTestID: 'tab-courses',
          tabBarIcon: () => getTabBarIcon('square.grid.3x3.fill', 'apps'),
        }}
      />
    </MainNativeNavigator.Navigator>
  );
};

export default MainTab;
