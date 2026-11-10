import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { AppState } from 'react-native';
import dayjs from 'dayjs';
import { t } from 'helpers/i18n';
import { loginRetryDelay } from 'helpers/loginRetry';
import { toast } from 'components/Toast';
import { getCredentials } from 'data/credentials';
import { getAuth, useAuthStore } from 'data/auth';
import { login } from 'data/login';
import { queryClient } from 'data/queryClient';

/**
 * Refetches the lists that are mounted and older than their stale time,
 * joining a fetch already under way rather than restarting it.
 */
const refreshOpenLists = () =>
  queryClient
    .refetchQueries({ type: 'active', stale: true }, { cancelRefetch: false })
    .catch(() => {});

const hasSavedLogin = () => {
  const credentials = getCredentials();
  return (
    !!credentials?.username &&
    !!credentials.password &&
    !!credentials.fingerPrint
  );
};

/** Whether a login may start on its own now. */
const canLogIn = () => {
  const auth = getAuth();
  return (
    !auth.ssoInProgress &&
    !auth.loggingIn &&
    !auth.reloginRequested &&
    hasSavedLogin()
  );
};

/**
 * Logs in again with the saved credentials: at launch, when the app comes
 * back after at least 10 minutes in the background (keeping the session if
 * the server still accepts it), and when it comes back without a session.
 * While the server can't be reached, it also retries on its own, less and
 * less often, as long as the app is open. Coming back with a session
 * refetches the open lists that are out of date.
 */
const useReLogin = () => {
  const appState = useRef(AppState.currentState);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const lastActiveTime = useRef(dayjs(0));
  const retries = useRef(0);

  const failure = useAuthStore(state => state.failure);
  const loggingIn = useAuthStore(state => state.loggingIn);
  const reloginRequested = useAuthStore(state => state.reloginRequested);

  const handleReLogin = useEffectEvent(async () => {
    if (!canLogIn()) {
      return;
    }
    const auth = getAuth();
    if (dayjs().diff(lastActiveTime.current, 'minute') >= 10) {
      toast(t('loggingIn'), 'none', 1 * 1000);
      // At launch there's no session yet; after a break the session may
      // still be good, which saves a full SSO login.
      await login(auth.loggedIn ? { resume: true } : { reset: true });
      // The lists only refresh by themselves when the session starts; one
      // that was already open would keep showing what it had.
      if (getAuth().loggedIn) {
        void refreshOpenLists();
      }
    } else if (auth.loggedIn) {
      void refreshOpenLists();
    } else if (auth.failure) {
      // Back from a short break without a session: try again quietly.
      void login({ reset: true });
    }
  });

  useEffect(() => {
    void handleReLogin();

    const sub = AppState.addEventListener('change', nextAppState => {
      if (appState.current === 'active' && nextAppState !== 'active') {
        lastActiveTime.current = dayjs();
      }

      if (
        appState.current?.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        void handleReLogin();
      }

      appState.current = nextAppState;
      setActive(nextAppState === 'active');
    });

    return () => sub.remove();
  }, []);

  const retry = useEffectEvent(() => {
    if (canLogIn() && getAuth().failure === 'offline') {
      retries.current += 1;
      void login({ reset: true });
    }
  });

  // A login the server turned down isn't retried on a timer: the same
  // password would only fail again, and might get the account locked.
  useEffect(() => {
    if (failure === null) {
      retries.current = 0;
    }
    if (failure !== 'offline' || loggingIn || reloginRequested || !active) {
      return;
    }
    const timer = setTimeout(retry, loginRetryDelay(retries.current));
    return () => clearTimeout(timer);
  }, [failure, loggingIn, reloginRequested, active]);
};

export default useReLogin;
