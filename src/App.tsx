import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ErrorBoundary from 'components/ErrorBoundary';
import { Toast } from 'components/Toast';
import Splash from 'components/Splash';
import { hasSavedLogin, useCredentials } from 'data/credentials';
import { useReloginRequested } from 'data/auth';
import { queryClient } from 'data/queryClient';
import useHelpCommands from 'hooks/useHelpCommands';
import useReLogin from 'hooks/useReLogin';
import useShareHandler from 'hooks/useShareHandler';
import useStoresLoaded from 'hooks/useStoresLoaded';
import {
  useIsPrimaryWindow,
  WindowProvider,
  type WindowProps,
} from 'hooks/useWindow';
import Navigation from 'navigation';
import { isApple } from 'helpers/platform';

/**
 * What the app does once for all its windows (`services/windows`), in one of
 * them: logging in again and coming back to the app, a file shared to
 * learnX, the Help menu.
 */
const AppWide = () => {
  useReLogin();
  useShareHandler();
  useHelpCommands();
  return null;
};

const Container = () => {
  const reloginRequested = useReloginRequested();
  const credentials = useCredentials();
  const hasCredentials = hasSavedLogin(credentials);
  const primary = useIsPrimaryWindow();

  return (
    <>
      {primary && <AppWide />}
      <Navigation showMain={hasCredentials && !reloginRequested} />
    </>
  );
};

const App = (windowProps: WindowProps) => {
  const colorScheme = useColorScheme();
  const loaded = useStoresLoaded();

  return (
    <WindowProvider {...windowProps}>
      <GestureHandlerRootView>
      <ErrorBoundary>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            {loaded ? <Container /> : <Splash />}
          </QueryClientProvider>
          <Toast />
        </SafeAreaProvider>
      </ErrorBoundary>
      <StatusBar
        // iOS's default style follows the appearance by itself.
        barStyle={
          isApple()
            ? 'default'
            : colorScheme === 'dark'
              ? 'light-content'
              : 'dark-content'
        }
        animated
      />
      </GestureHandlerRootView>
    </WindowProvider>
  );
};

export default App;
