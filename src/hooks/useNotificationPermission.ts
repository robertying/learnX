import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import {
  canScheduleExactAlarms,
  getNotificationPermission,
  NotificationPermission,
  requestExactAlarms,
  requestNotificationPermission,
} from 'helpers/notifications';

/**
 * The notification permission and whether reminders can be exact (Android
 * 12 and later), checked again when the app comes back from the system
 * settings, and ways to ask for them.
 */
const useNotificationPermission = () => {
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null,
  );
  const [exactAlarms, setExactAlarms] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => {
      getNotificationPermission().then(setPermission, () => {});
      canScheduleExactAlarms().then(setExactAlarms, () => {});
    };
    check();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        check();
      }
    });
    return () => sub.remove();
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

  return { permission, request, exactAlarms, requestExact };
};

export default useNotificationPermission;
