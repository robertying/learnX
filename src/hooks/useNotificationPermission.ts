import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import {
  getNotificationPermission,
  NotificationPermission,
  requestNotificationPermission,
} from 'helpers/notifications';

/**
 * The notification permission, checked again when the app comes back from
 * the system settings, and a way to ask for it.
 */
const useNotificationPermission = () => {
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null,
  );

  useEffect(() => {
    const check = () =>
      getNotificationPermission().then(setPermission, () => {});
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

  return { permission, request };
};

export default useNotificationPermission;
