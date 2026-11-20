import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { AppState } from 'react-native';
import dayjs from 'dayjs';
import * as Updates from 'expo-updates';
import { t } from 'helpers/i18n';
import { isRefusal } from 'helpers/errors';
import { loginRetryDelay, retriesOnTimer } from 'helpers/loginRetry';
import { toast } from 'components/Toast';
import {
  hasSavedLogin,
  refusedLoginRetryDue,
  savedLoginRefusal,
} from 'data/credentials';
import { getAuth, useAuthStore } from 'data/auth';
import { login } from 'data/login';
import { queryClient } from 'data/queryClient';
import { retryDelayScale } from 'data/source';
import { flushServerActionsWithin } from 'data/serverActions';
import { updateOnReturn } from 'services/ota';

/** How long the waiting server actions may hold up the refetch on return. */
const FLUSH_BEFORE_REFETCH_MS = 3_000;

/**
 * Catches up once there's a session: sends the server actions that are
 * waiting (offline, or from a notification), so the lists fetched next
 * already have them, then refetches the lists that are mounted and older than
 * their stale time, joining a fetch already under way rather than restarting
 * it.
 */
const catchUp = async () => {
  await flushServerActionsWithin(FLUSH_BEFORE_REFETCH_MS);
  await queryClient
    .refetchQueries({ type: 'active', stale: true }, { cancelRefetch: false })
    .catch(() => {});
};

/**
 * When the app was last left, and whether the launch login has run. Kept for
 * the JS runtime: with several windows (iPad, Mac), the one running this hook
 * can close, and the next one carries on rather than logging in as at launch.
 */
const lastActive = { time: dayjs(0), launched: false };

/** For tests: as at launch. */
export const resetReLogin = () => {
  lastActive.time = dayjs(0);
  lastActive.launched = false;
};

/**
 * Whether a login may start on its own now. Not after the saved login was
 * refused (a wrong password, a device no longer trusted): it would only be
 * refused again, and more wrong passwords may lock the account. The user logs
 * in again from the lists' status row instead. A day later it's tried once
 * more, at launch or on return, in case the refusal was a passing answer
 * (`data/credentials`).
 */
const canLogIn = () => {
  const auth = getAuth();
  return (
    !auth.ssoInProgress &&
    !auth.loggingIn &&
    !auth.reloginRequested &&
    (!isRefusal(auth.failure) || refusedLoginRetryDue()) &&
    hasSavedLogin()
  );
};

/**
 * Logs in again with the saved credentials: at launch, when the app comes
 * back after at least 10 minutes in the background (keeping the session if
 * the server still accepts it), and when it comes back without a session.
 * While the server can't be reached or answers with errors, it also retries
 * on its own, less and less often, as long as the app is open. This is the
 * one place that handles coming back to the app: an over-the-air update first
 * (`services/ota`), which when one starts leaves the rest to the reloaded app,
 * then the session, then, with a session, the waiting server actions, then
 * the open lists that are out of date.
 */
const useReLogin = () => {
  const appState = useRef(AppState.currentState);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const retries = useRef(0);

  const failure = useAuthStore(state => state.failure);
  const loggingIn = useAuthStore(state => state.loggingIn);
  const reloginRequested = useAuthStore(state => state.reloginRequested);
  const { isUpdatePending } = Updates.useUpdates();

  const handleReLogin = useEffectEvent(async () => {
    if (!canLogIn()) {
      return;
    }
    const auth = getAuth();
    if (dayjs().diff(lastActive.time, 'minute') >= 10) {
      // Not for a refused login the server isn't asked about again yet
      // (`data/source`): it fails at once, and its status row says why.
      if (!savedLoginRefusal() || refusedLoginRetryDue()) {
        toast(t('loggingIn'), 'none', { duration: 1 * 1000 });
      }
      // At launch there's no session yet; after a break the session may
      // still be good, which saves a full SSO login.
      await login(auth.loggedIn ? { resume: true } : {});
      // The lists only refresh by themselves when the session starts; one
      // that was already open would keep showing what it had.
      if (getAuth().loggedIn) {
        await catchUp();
      }
    } else if (auth.loggedIn) {
      await catchUp();
    } else if (auth.failure) {
      // Back from a short break without a session: try again quietly.
      void login({});
    }
  });

  const handleReturn = useEffectEvent(async () => {
    const away = dayjs().diff(lastActive.time);
    if (await updateOnReturn(away, isUpdatePending)) {
      return;
    }
    await handleReLogin();
  });

  useEffect(() => {
    if (!lastActive.launched) {
      lastActive.launched = true;
      void handleReLogin();
    }

    const sub = AppState.addEventListener('change', nextAppState => {
      if (appState.current === 'active' && nextAppState !== 'active') {
        lastActive.time = dayjs();
      }

      if (
        appState.current?.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        void handleReturn();
      }

      appState.current = nextAppState;
      setActive(nextAppState === 'active');
    });

    return () => sub.remove();
  }, []);

  const retry = useEffectEvent(() => {
    if (canLogIn() && retriesOnTimer(getAuth().failure)) {
      retries.current += 1;
      void login({});
    }
  });

  // Only a login that got no answer or a server error is retried on a timer
  // (helpers/loginRetry), each on its own schedule from the start.
  const retrying = useRef(failure);
  useEffect(() => {
    if (failure !== retrying.current) {
      retrying.current = failure;
      retries.current = 0;
    }
    if (!retriesOnTimer(failure) || loggingIn || reloginRequested || !active) {
      return;
    }
    const timer = setTimeout(
      retry,
      loginRetryDelay(retries.current, failure) * retryDelayScale(),
    );
    return () => clearTimeout(timer);
  }, [failure, loggingIn, reloginRequested, active]);
};

export default useReLogin;
