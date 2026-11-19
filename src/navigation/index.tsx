import { useState } from 'react';
import DeviceInfo from 'constants/DeviceInfo';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { useSafeAreaFrame } from 'react-native-safe-area-context';
import { RootStackParams, AndroidRootStackParams } from './types';
import { SplitViewProvider } from './SplitView';
import SplitSizes from 'constants/SplitSizes';
import { trackScreen } from 'services/crashReporting';
import { useNavigationTheme } from 'theme';
import { renderDetailContainer } from './DetailStack';
import MainTab from './MainTab';
import WindowFrame from './WindowFrame';
import { initialTab, nativeSplit } from './layout';
import { createRootNavigation, RootNavigationContext } from './rootNavigation';
import useBackKeys from './useBackKeys';
import Setup from 'screens/Setup';
import {
  AssignmentSubmissionStack,
  CourseXStack,
  LoginStack,
  SearchStack,
  SemesterSelectionStack,
  WhatsNewStack,
} from './stacks';
import { isAndroid, isApple } from 'helpers/platform';

const RootNavigator = createNativeStackNavigator<RootStackParams>();

// A page sheet on iOS, iPadOS and Mac, which a swipe down closes, as the
// system's own apps present search and web pages. Android covers the window.
const sheetOptions: NativeStackNavigationOptions = isApple()
  ? { presentation: 'pageSheet' }
  : { gestureEnabled: false };

const rootScreenOptions = {
  headerShown: false,
  presentation: 'transparentModal',
} as const;
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
    screenOptions={
      // The Mac has no sheet detents: a form sheet there opens and closes
      // without its slide, takes a moment to come and go, and leaves the
      // window unclickable for a moment after it closes. It gets the page
      // sheet Search has.
      DeviceInfo.isMac()
        ? sheetOptions
        : {
            presentation: 'formSheet',
            sheetAllowedDetents: [1],
            // Material 3's extra-large shape; iOS keeps the system's.
            sheetCornerRadius: isAndroid() ? 28 : undefined,
          }
    }
  >
    <Sheets.Screen name="Setup" component={Setup} />
    <Sheets.Screen name="WhatsNewStack" component={WhatsNewStack} />
  </Sheets.Group>
);

// Typed against the modals' own params, which both roots include.
const Modals =
  createNativeStackNavigator<
    Pick<
      RootStackParams,
      | 'CourseXStack'
      | 'SearchStack'
      | 'SemesterSelectionStack'
      | 'AssignmentSubmissionStack'
    >
  >();

/**
 * Search, CourseX, the semesters and a submission, over the whole window:
 * page sheets on iOS, iPadOS and Mac, and on Android above the split view
 * (the root navigator there), not inside the list's pane. A page about the
 * whole app (Search, every course's CourseX, the semesters from an item that
 * isn't in the semester shown) always opens here; one about the item open
 * in a split view's detail pane (a course's CourseX, an assignment's
 * submission) is pushed in that pane, and opens here only where there is none.
 */
const renderModals = () => (
  <Modals.Group screenOptions={sheetOptions}>
    <Modals.Screen name="CourseXStack" component={CourseXStack} />
    <Modals.Screen name="SearchStack" component={SearchStack} />
    <Modals.Screen
      name="SemesterSelectionStack"
      component={SemesterSelectionStack}
    />
    {/* The draft is saved as it's written, so a swipe down loses nothing
        (the screen holds it while uploading). */}
    <Modals.Screen
      name="AssignmentSubmissionStack"
      component={AssignmentSubmissionStack}
    />
  </Modals.Group>
);

const renderMainScreens = () => (
  <>
    <RootNavigator.Screen name="MainTab" component={MainTab} />
    {/* Android shows these above its split view (AndroidRootNavigator). */}
    {nativeSplit && renderModals()}
    {nativeSplit && renderSheets()}
  </>
);

/**
 * Android's main UI, in the split view drawn in JS (`SplitViewProvider`); the
 * Electron app's too, with its navigation pane beside it (`WindowFrame`).
 */
const AndroidMain = () => {
  const frame = useSafeAreaFrame();
  const showDetail = frame.width > SplitSizes.maxCollapsedWidth;

  return (
    <WindowFrame>
      <SplitViewProvider
        showDetail={showDetail}
        initialTab={initialTab}
        renderDetail={renderDetailContainer}
      >
        <RootNavigator.Navigator screenOptions={rootScreenOptions}>
          {renderMainScreens()}
        </RootNavigator.Navigator>
      </SplitViewProvider>
    </WindowFrame>
  );
};

/**
 * The app's screens: the main UI when `showMain`, the login otherwise.
 */
const Navigation: React.FC<{ showMain: boolean }> = ({ showMain }) => {
  const theme = useNavigationTheme();
  const [rootNavigation] = useState(createRootNavigation);
  // The Electron app's back keys at login; the split view has the main UI's.
  useBackKeys(rootNavigation, null, !showMain);

  return (
    <RootNavigationContext.Provider value={rootNavigation}>
      <NavigationContainer
        ref={rootNavigation}
        theme={theme}
        onStateChange={trackScreen}
      >
        {nativeSplit ? (
          <RootNavigator.Navigator screenOptions={rootScreenOptions}>
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
                {renderModals()}
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
    </RootNavigationContext.Provider>
  );
};

export default Navigation;
