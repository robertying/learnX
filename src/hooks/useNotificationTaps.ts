import { useEffect, useEffectEvent } from 'react';
import { useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import {
  getNotificationTarget,
  NotificationTarget,
} from 'helpers/notifications';
import { setPendingNotificationTarget } from 'hooks/useNotificationTarget';

/**
 * Opens what a tapped notification points to: the item's detail, or its list.
 * Handles the tap that launched the app as well as taps while it runs.
 */
const useNotificationTaps = () => {
  const navigation = useNavigation();
  const response = Notifications.useLastNotificationResponse();

  const open = useEffectEvent((target: NotificationTarget) => {
    // The list opens the item, as a tap on it would, so it lands in the
    // detail pane of a split view and on top of the list on a phone.
    setPendingNotificationTarget(target.id ? target : null);
    switch (target.type) {
      case 'notice':
        return navigation.navigate('MainTab', {
          screen: 'NoticeStack',
          params: { screen: 'Notices', pop: true },
        });
      case 'assignment':
        return navigation.navigate('MainTab', {
          screen: 'AssignmentStack',
          params: { screen: 'Assignments', pop: true },
        });
      case 'file':
        return navigation.navigate('MainTab', {
          screen: 'FileStack',
          params: { screen: 'Files', pop: true },
        });
    }
  });

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
