import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/en';
import 'dayjs/locale/zh-cn';
import { isLocaleChinese, t } from 'helpers/i18n';
import ErrorBoundary from 'components/ErrorBoundary';
import { Toast, toast } from 'components/Toast';
import Splash from 'components/Splash';
import { useCredentials } from 'data/credentials';
import { useLoginError, useReloginRequested } from 'data/auth';
import { queryClient } from 'data/queryClient';
import useReLogin from 'hooks/useReLogin';
import useShareHandler from 'hooks/useShareHandler';
import useStoresLoaded from 'hooks/useStoresLoaded';
import Navigation from 'navigation';

dayjs.extend(relativeTime);
dayjs.locale(isLocaleChinese() ? 'zh-cn' : 'en');

const Container = () => {
  const loginError = useLoginError();
  const reloginRequested = useReloginRequested();
  const credentials = useCredentials();
  const hasCredentials =
    !!credentials?.username &&
    !!credentials.password &&
    !!credentials.fingerPrint;

  useReLogin();
  useShareHandler();

  // With a saved login the main UI stays up when a login fails, and its lists
  // say so; the login screen only reports failures while it's shown.
  useEffect(() => {
    if (hasCredentials && reloginRequested && loginError) {
      toast(t('loginFailed'), 'error', 8 * 1000);
    }
  }, [hasCredentials, reloginRequested, loginError]);

  return <Navigation showMain={hasCredentials && !reloginRequested} />;
};

const App = () => {
  const colorScheme = useColorScheme();
  const loaded = useStoresLoaded();

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
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        animated
      />
    </GestureHandlerRootView>
  );
};

export default App;
