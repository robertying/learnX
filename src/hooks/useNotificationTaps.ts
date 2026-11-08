import { useEffect, useEffectEvent } from 'react';
import * as Notifications from 'expo-notifications';
import { getNotificationTarget } from 'helpers/notifications';
import useOpenTarget from 'hooks/useOpenTarget';

/**
 * Opens what a tapped notification points to: the item's detail, or its list.
 * Handles the tap that launched the app as well as taps while it runs.
 */
const useNotificationTaps = () => {
  const response = Notifications.useLastNotificationResponse();
  const open = useEffectEvent(useOpenTarget());

  useEffect(() => {
    if (
      !response ||
      response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      return;
    }
    const target = getNotificationTarget(response);
    if (target) {
      open(target);
    }
    // Opened once; a later mount (e.g. after logging in again) shouldn't
    // open it again.
    Notifications.clearLastNotificationResponse();
  }, [response]);
};

export default useNotificationTaps;
