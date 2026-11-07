import { useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import {
  NavigationContainer,
  NavigationContainerRef,
  NavigationIndependentTree,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  SafeAreaProvider,
  useSafeAreaFrame,
} from 'react-native-safe-area-context';
import { RootStackParams, SplitRootStackParams } from 'screens/types';
import Splash from 'components/Splash';
import { SplitViewProvider } from 'components/SplitView';
import { WindowSafeAreaProvider } from 'components/WindowSafeArea';
import Numbers from 'constants/Numbers';
import Styles from 'constants/Styles';
import DeviceInfo from 'constants/DeviceInfo';
import { useNavigationTheme } from 'theme';
import { DetailStack } from './DetailStack';
import MainTab from './MainTab';
import { nativeSplit } from './layout';
import {
  AssignmentSubmissionStack,
  CourseXStack,
  LoginStack,
  SearchStack,
} from './stacks';

const RootNavigator = createNativeStackNavigator<RootStackParams>();
const SplitRootNavigator = createNativeStackNavigator<SplitRootStackParams>();

const renderMainScreens = () => (
  <>
    <RootNavigator.Screen name="MainTab" component={MainTab} />
    <RootNavigator.Screen
      name="CourseXStack"
      component={CourseXStack}
      options={{ gestureEnabled: false }}
    />
    <RootNavigator.Screen
      name="SearchStack"
      component={SearchStack}
      options={{ gestureEnabled: false }}
    />
    <RootNavigator.Screen
      name="AssignmentSubmissionStack"
      component={AssignmentSubmissionStack}
      options={{ gestureEnabled: false }}
    />
  </>
);

const SplitMain = () => {
  const theme = useNavigationTheme();
  const frame = useSafeAreaFrame();
  const detailNavigationContainerRef = useRef<NavigationContainerRef<{}>>(null);

  // The master pane mounts along with the detail container, before the ref is
  // set. Hand the ref out only once it is, so that its consumers render again.
  const [detailReady, setDetailReady] = useState(false);

  const showDetail = frame.width > Numbers.splitViewMaxCollapsedWidth;

  return (
    <SplitViewProvider
      splitEnabled={
        DeviceInfo.isMac() || DeviceInfo.isTablet() || Platform.OS === 'android'
      }
      detailNavigationContainerRef={
        showDetail && detailReady ? detailNavigationContainerRef : null
      }
      showDetail={showDetail}
    >
      <RootNavigator.Navigator
        screenOptions={{
          headerShown: false,
          presentation: 'transparentModal',
        }}
      >
        {renderMainScreens()}
      </RootNavigator.Navigator>
      <NavigationIndependentTree>
        <NavigationContainer
          ref={detailNavigationContainerRef}
          theme={theme}
          fallback={<Splash />}
          onReady={() => setDetailReady(true)}
        >
          <DetailStack />
        </NavigationContainer>
      </NavigationIndependentTree>
    </SplitViewProvider>
  );
};

// Login sits beside the split rather than in its master pane, so it always
// covers the whole window and the panes never resize underneath it.
const SplitLogin = () => (
  // On Mac Catalyst, the native side keeps stacks under this identifier out of
  // the view controller hierarchy, as it did when login was in the master pane.
  <View testID="rns-split-detail" style={Styles.flex1}>
    <LoginStack />
  </View>
);

/**
 * The app's screens: the main UI when `showMain`, the login otherwise.
 */
const Navigation: React.FC<{ showMain: boolean }> = ({ showMain }) => {
  const theme = useNavigationTheme();

  return (
    <SafeAreaProvider>
      <WindowSafeAreaProvider>
        <NavigationContainer theme={theme} fallback={<Splash />}>
          {nativeSplit ? (
            <RootNavigator.Navigator
              screenOptions={{
                headerShown: false,
                presentation: 'transparentModal',
              }}
            >
              {showMain ? (
                renderMainScreens()
              ) : (
                <RootNavigator.Screen
                  name="LoginStack"
                  component={LoginStack}
                  options={{ gestureEnabled: false }}
                />
              )}
            </RootNavigator.Navigator>
          ) : (
            <SplitRootNavigator.Navigator
              screenOptions={{ headerShown: false }}
            >
              {showMain ? (
                <SplitRootNavigator.Screen
                  name="Main"
                  component={SplitMain}
                  // Login slides away to reveal the main UI.
                  options={{ animationTypeForReplace: 'pop' }}
                />
              ) : (
                <SplitRootNavigator.Screen
                  name="LoginStack"
                  component={SplitLogin}
                  options={{
                    animation: 'slide_from_bottom',
                    gestureEnabled: false,
                  }}
                />
              )}
            </SplitRootNavigator.Navigator>
          )}
        </NavigationContainer>
      </WindowSafeAreaProvider>
    </SafeAreaProvider>
  );
};

export default Navigation;
