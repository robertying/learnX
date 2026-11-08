import { useRef } from 'react';
import {
  NavigationContainer,
  NavigationContainerRef,
  NavigationIndependentTree,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { t } from 'helpers/i18n';
import { trackScreen } from 'helpers/crashReporting';
import NoticeDetail from 'screens/NoticeDetail';
import { DetailStackParams, ExtraParams } from 'screens/types';
import AssignmentDetail from 'screens/AssignmentDetail';
import FileDetail from 'screens/FileDetail';
import CourseDetail from 'screens/CourseDetail';
import AssignmentSubmission from 'screens/AssignmentSubmission';
import CourseX from 'screens/CourseX';
import { getTitleOptions } from 'components/HeaderTitle';
import Empty from 'components/Empty';
import SafeArea from 'components/SafeArea';
import NativeSplitViewProvider from 'components/NativeSplitView';
import DeviceInfo from 'constants/DeviceInfo';
import { useNavigationTheme } from 'theme';
import { nativeSplit } from './layout';
import { getDetailScreenOptions } from './options';
import { renderSettingDetails } from './stacks';

const DetailNavigator = createNativeStackNavigator<DetailStackParams>();

// The detail column extends underneath the primary one.
const EmptyDetail = () => (
  <SafeArea>
    <Empty />
  </SafeArea>
);

export const DetailStack = () => (
  <DetailNavigator.Navigator
    // Has to be in place when the screen mounts; set from the screen itself, it
    // races the native transition.
    screenOptions={({ route }) => ({
      animation: (route.params as ExtraParams | undefined)?.disableAnimation
        ? 'none'
        : undefined,
    })}
  >
    <DetailNavigator.Screen
      name="EmptyDetail"
      component={EmptyDetail}
      options={{
        ...getTitleOptions(''),
        headerShown: !nativeSplit || DeviceInfo.isIPad(),
      }}
    />
    <DetailNavigator.Screen
      name="NoticeDetail"
      component={NoticeDetail}
      options={getDetailScreenOptions()}
    />
    <DetailNavigator.Screen
      name="AssignmentDetail"
      component={AssignmentDetail}
      options={getDetailScreenOptions()}
    />
    <DetailNavigator.Screen
      name="FileDetail"
      component={FileDetail}
      options={getDetailScreenOptions()}
    />
    <DetailNavigator.Screen
      name="CourseDetail"
      component={CourseDetail}
      options={getDetailScreenOptions()}
    />
    <DetailNavigator.Screen
      name="AssignmentSubmission"
      component={AssignmentSubmission}
      options={getDetailScreenOptions()}
    />
    <DetailNavigator.Screen
      name="CourseX"
      component={CourseX}
      options={getDetailScreenOptions(t('courseX'))}
    />
    {renderSettingDetails()}
  </DetailNavigator.Navigator>
);

const DetailContainer: React.FC<{
  navigationContainerRef: React.RefObject<NavigationContainerRef<{}> | null>;
}> = ({ navigationContainerRef }) => {
  const theme = useNavigationTheme();

  return (
    <NavigationIndependentTree>
      <NavigationContainer
        ref={navigationContainerRef}
        theme={theme}
        onStateChange={trackScreen}
      >
        <DetailStack />
      </NavigationContainer>
    </NavigationIndependentTree>
  );
};

export const renderDetailContainer = (
  ref: React.RefObject<NavigationContainerRef<{}> | null>,
) => <DetailContainer navigationContainerRef={ref} />;

/** A tab of the native split view, with a detail pane of its own. */
export const TabSplit: React.FC<React.PropsWithChildren> = ({ children }) => {
  const detailNavigationContainerRef = useRef<NavigationContainerRef<{}>>(null);

  return (
    <NativeSplitViewProvider
      enabled
      detailNavigationContainerRef={detailNavigationContainerRef}
    >
      {children}
      <DetailContainer navigationContainerRef={detailNavigationContainerRef} />
    </NativeSplitViewProvider>
  );
};
