import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type { BackgroundRefreshState } from 'modules/background';
import {
  canScheduleExactAlarms,
  getBackgroundRefreshState,
  getNotificationPermission,
  NotificationPermission,
  onPermissionAnswered,
  requestExactAlarms,
  requestNotificationPermission,
} from 'services/notifications';

/**
 * The notification permission, whether reminders can be exact (Android 12
 * and later) and whether the system lets the background sync run, checked
 * again when the app comes back from the system
 * settings and after each request for the permission, and ways to ask for
 * them.
 */
const useNotificationPermission = () => {
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null,
  );
  const [exactAlarms, setExactAlarms] = useState<boolean | null>(null);
  const [backgroundRefresh, setBackgroundRefresh] =
    useState<BackgroundRefreshState | null>(null);

  useEffect(() => {
    const check = () => {
      getNotificationPermission().then(setPermission, () => {});
      canScheduleExactAlarms().then(setExactAlarms, () => {});
      void getBackgroundRefreshState().then(setBackgroundRefresh);
    };
    check();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        check();
      }
    });
    // Also after it's asked for elsewhere, e.g. by Setup.
    const stop = onPermissionAnswered(check);
    return () => {
      sub.remove();
      stop();
    };
  }, []);

  /** Asks if needed; resolves to whether notifications can be shown. */
  const request = async () => {
    const result =
      permission === 'granted'
        ? permission
        : await requestNotificationPermission();
    setPermission(result);
    return result === 'granted';
  };

  /** Opens the system page that allows exact alarms. */
  const requestExact = async () => {
    setExactAlarms(await requestExactAlarms());
  };

  return { permission, request, exactAlarms, requestExact, backgroundRefresh };
};

export default useNotificationPermission;
