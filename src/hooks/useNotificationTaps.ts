import { useEffect, useEffectEvent } from 'react';
import * as Notifications from 'expo-notifications';
import { getNotificationTarget } from 'services/notifications';
import useOpenTarget from 'hooks/useOpenTarget';
import { useWindow } from 'hooks/useWindow';
import { isTargetWindow } from 'services/windows';

/**
 * Opens what a tapped notification points to: the item's detail, or its list.
 * Handles the tap that launched the app as well as taps while it runs.
 */
const useNotificationTaps = () => {
  const response = Notifications.useLastNotificationResponse();
  const open = useEffectEvent(useOpenTarget());
  const { windowId } = useWindow();

  useEffect(() => {
    if (
      !response ||
      response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER ||
      // Every window hears of the tap; the one UIKit brought forward opens it.
      !isTargetWindow(windowId)
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
  }, [response, windowId]);
};

export default useNotificationTaps;
