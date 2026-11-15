import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform, StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ErrorBoundary from 'components/ErrorBoundary';
import { Toast } from 'components/Toast';
import Splash from 'components/Splash';
import { hasSavedLogin, useCredentials } from 'data/credentials';
import { useReloginRequested } from 'data/auth';
import { queryClient } from 'data/queryClient';
import useOtaUpdate from 'hooks/useOtaUpdate';
import useReLogin from 'hooks/useReLogin';
import useShareHandler from 'hooks/useShareHandler';
import useStoresLoaded from 'hooks/useStoresLoaded';
import Navigation from 'navigation';

const Container = () => {
  const reloginRequested = useReloginRequested();
  const credentials = useCredentials();
  const hasCredentials = hasSavedLogin(credentials);

  useReLogin();
  useShareHandler();

  return <Navigation showMain={hasCredentials && !reloginRequested} />;
};

const App = () => {
  const colorScheme = useColorScheme();
  const loaded = useStoresLoaded();
  useOtaUpdate();

  return (
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
          Platform.OS === 'ios'
            ? 'default'
            : colorScheme === 'dark'
              ? 'light-content'
              : 'dark-content'
        }
        animated
      />
    </GestureHandlerRootView>
  );
};

export default App;
