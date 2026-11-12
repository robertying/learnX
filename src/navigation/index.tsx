import { Platform } from 'react-native';
import { useRef } from 'react';
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
import {
  DetailStackParams,
  RootStackParams,
  AndroidRootStackParams,
} from './types';
import Splash from 'components/Splash';
import { SplitViewProvider } from './SplitView';
import SplitSizes from 'constants/SplitSizes';
import { trackScreen } from 'services/crashReporting';
import { reportDetailReady } from 'hooks/useDetailNavigator';
import { useNavigationTheme } from 'theme';
import { DetailStack } from './DetailStack';
import MainTab from './MainTab';
import { nativeSplit } from './layout';
import Setup from 'screens/Setup';
import {
  AssignmentSubmissionStack,
  CourseXStack,
  LoginStack,
  SearchStack,
  WhatsNewStack,
} from './stacks';

const RootNavigator = createNativeStackNavigator<RootStackParams>();
const AndroidRootNavigator =
  createNativeStackNavigator<AndroidRootStackParams>();

// Typed against the sheets' own params, which both roots include (as the
// shared screens in stacks.tsx are).
const Sheets =
  createNativeStackNavigator<
    Pick<RootStackParams, 'Setup' | 'WhatsNewStack'>
  >();

/** Sheets the main UI opens with (hooks/useLaunchSheet). */
const renderSheets = () => (
  <Sheets.Group
    screenOptions={{
      presentation: 'formSheet',
      sheetAllowedDetents: [1],
      // Material 3's extra-large shape; iOS keeps the system's.
      sheetCornerRadius: Platform.OS === 'android' ? 28 : undefined,
    }}
  >
    <Sheets.Screen name="Setup" component={Setup} />
    <Sheets.Screen name="WhatsNewStack" component={WhatsNewStack} />
  </Sheets.Group>
);

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
    {/* Android shows these above its split view (AndroidRootNavigator). */}
    {nativeSplit && renderSheets()}
  </>
);

/** Android's main UI, in the split view drawn in JS (`SplitViewProvider`). */
const AndroidMain = () => {
  const theme = useNavigationTheme();
  const frame = useSafeAreaFrame();
  const detailNavigationContainerRef =
    useRef<NavigationContainerRef<DetailStackParams>>(null);

  const showDetail = frame.width > SplitSizes.maxCollapsedWidth;

  return (
    <SplitViewProvider
      detailNavigationContainerRef={
        showDetail ? detailNavigationContainerRef : null
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
          onReady={reportDetailReady}
          onStateChange={trackScreen}
        >
          <DetailStack />
        </NavigationContainer>
      </NavigationIndependentTree>
    </SplitViewProvider>
  );
};

/**
 * The app's screens: the main UI when `showMain`, the login otherwise.
 */
const Navigation: React.FC<{ showMain: boolean }> = ({ showMain }) => {
  const theme = useNavigationTheme();

  return (
    <SafeAreaProvider>
      <NavigationContainer
        theme={theme}
        fallback={<Splash />}
        onStateChange={trackScreen}
      >
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
          <AndroidRootNavigator.Navigator
            screenOptions={{ headerShown: false }}
          >
            {showMain ? (
              <>
                <AndroidRootNavigator.Screen
                  name="Main"
                  component={AndroidMain}
                  // Login slides away to reveal the main UI.
                  options={{ animationTypeForReplace: 'pop' }}
                />
                {/* Over the whole window, not inside the list's pane */}
                {renderSheets()}
              </>
            ) : (
              // Beside the split rather than in its master pane, so it always
              // covers the whole window and the panes never resize under it.
              <AndroidRootNavigator.Screen
                name="LoginStack"
                component={LoginStack}
                options={{
                  animation: 'slide_from_bottom',
                  gestureEnabled: false,
                }}
              />
            )}
          </AndroidRootNavigator.Navigator>
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default Navigation;
