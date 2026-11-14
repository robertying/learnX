import { useRef } from 'react';
import {
  NavigationContainer,
  NavigationContainerRef,
  NavigationIndependentTree,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { t } from 'helpers/i18n';
import { trackScreen } from 'services/crashReporting';
import { reportDetailReady, reportDetailState } from 'hooks/useDetailNavigator';
import {
  DetailNavigationContainerRef,
  DetailStackParams,
  ExtraParams,
} from './types';
import AssignmentSubmission from 'screens/AssignmentSubmission';
import CourseX from 'screens/CourseX';
import StatusView from 'components/StatusView';
import SafeArea from 'components/SafeArea';
import NativeSplitViewProvider from './NativeSplitView';
import DeviceInfo from 'constants/DeviceInfo';
import { useNavigationTheme } from 'theme';
import { nativeSplit } from './layout';
import {
  getDetailScreenOptions,
  getTitleOptions,
  stackScreenOptions,
} from './options';
import { screenLayout } from './screenLayout';
import {
  allItemDetails,
  renderItemDetails,
  renderSettingDetails,
  renderTodayDetails,
} from './stacks';

const DetailNavigator = createNativeStackNavigator<DetailStackParams>();

// The detail column extends underneath the primary one. Nothing is open in
// it yet: the empty state's text alone, saying so.
const EmptyDetail = () => (
  <SafeArea>
    <StatusView title={t('noSelection')} />
  </SafeArea>
);

export const DetailStack = () => (
  <DetailNavigator.Navigator
    screenLayout={screenLayout}
    // Has to be in place when the screen mounts; set from the screen itself, it
    // races the native transition.
    screenOptions={({ route }) => ({
      ...stackScreenOptions,
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
    {renderTodayDetails()}
    {renderItemDetails(allItemDetails)}
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

/** A split view's detail stack, in a navigation container of its own. */
export const DetailContainer: React.FC<{
  navigationContainerRef: DetailNavigationContainerRef;
}> = ({ navigationContainerRef }) => {
  const theme = useNavigationTheme();

  return (
    <NavigationIndependentTree>
      <NavigationContainer
        ref={navigationContainerRef}
        theme={theme}
        onReady={() => {
          reportDetailState(
            navigationContainerRef,
            navigationContainerRef.current?.getRootState(),
          );
          reportDetailReady();
        }}
        onStateChange={state => {
          reportDetailState(navigationContainerRef, state);
          trackScreen(state);
        }}
      >
        <DetailStack />
      </NavigationContainer>
    </NavigationIndependentTree>
  );
};

export const renderDetailContainer = (ref: DetailNavigationContainerRef) => (
  <DetailContainer navigationContainerRef={ref} />
);

/** A tab of the native split view, with a detail pane of its own. */
export const TabSplit: React.FC<React.PropsWithChildren> = ({ children }) => {
  const detailNavigationContainerRef =
    useRef<NavigationContainerRef<DetailStackParams>>(null);

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
