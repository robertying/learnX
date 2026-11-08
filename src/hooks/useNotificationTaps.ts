import { useEffect, useEffectEvent } from 'react';
import { StackActions, useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import {
  getNotificationTarget,
  NotificationTarget,
} from 'helpers/notifications';
import useDetailNavigator from 'hooks/useDetailNavigator';

const details = {
  notice: 'NoticeDetail',
  assignment: 'AssignmentDetail',
  file: 'FileDetail',
} as const;

/**
 * Opens what a tapped notification points to: the item's detail, or its list.
 * Handles the tap that launched the app as well as taps while it runs.
 */
const useNotificationTaps = () => {
  const navigation = useNavigation();
  const detailNavigator = useDetailNavigator();
  const response = Notifications.useLastNotificationResponse();

  /** Shows the type's tab, with the item's detail on top of its list. */
  const openTab = (type: NotificationTarget['type'], id?: string) => {
    switch (type) {
      case 'notice':
        return navigation.navigate('MainTab', {
          screen: 'NoticeStack',
          params: id
            ? { screen: 'NoticeDetail', params: { id }, initial: false }
            : { screen: 'Notices' },
        });
      case 'assignment':
        return navigation.navigate('MainTab', {
          screen: 'AssignmentStack',
          params: id
            ? { screen: 'AssignmentDetail', params: { id }, initial: false }
            : { screen: 'Assignments' },
        });
      case 'file':
        return navigation.navigate('MainTab', {
          screen: 'FileStack',
          params: id
            ? { screen: 'FileDetail', params: { id }, initial: false }
            : { screen: 'Files' },
        });
    }
  };

  const open = useEffectEvent(({ type, id }: NotificationTarget) => {
    if (!detailNavigator) {
      openTab(type, id);
      return;
    }
    // A split view shows the detail beside the list.
    openTab(type);
    if (id) {
      detailNavigator.dispatch(
        StackActions.replace(details[type], { id, disableAnimation: true }),
      );
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
