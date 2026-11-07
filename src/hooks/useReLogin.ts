import { useEffect, useEffectEvent, useRef } from 'react';
import { AppState } from 'react-native';
import dayjs from 'dayjs';
import { t } from 'helpers/i18n';
import { toast } from 'components/Toast';
import { getCredentials } from 'data/credentials';
import { getAuth } from 'data/auth';
import { login } from 'data/login';

/**
 * Logs in again with the saved credentials at launch and when the app comes
 * back after at least 10 minutes in the background.
 */
const useReLogin = () => {
  const appState = useRef(AppState.currentState);
  const lastActiveTime = useRef(dayjs(0));

  const handleReLogin = useEffectEvent(() => {
    const currentAuth = getAuth();
    const currentCredentials = getCredentials();
    if (
      !currentAuth.ssoInProgress &&
      currentCredentials?.username &&
      currentCredentials.password &&
      currentCredentials.fingerPrint &&
      dayjs().diff(lastActiveTime.current, 'minute') >= 10
    ) {
      login({ reset: true });
      toast(t('loggingIn'), 'none', 1 * 1000);
    }
  });

  useEffect(() => {
    handleReLogin();

    const sub = AppState.addEventListener('change', nextAppState => {
      if (appState.current === 'active' && nextAppState !== 'active') {
        lastActiveTime.current = dayjs();
      }

      if (
        appState.current?.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        handleReLogin();
      }

      appState.current = nextAppState;
    });

    return () => sub.remove();
  }, []);
};

export default useReLogin;
