import { useEffect, useEffectEvent } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { setSetupSeen, useAppStateStore } from 'data/appState';
import { whatsNewContext, whatsNewSince } from 'helpers/whatsNew';
import type { RootStackParams } from 'screens/types';

// What happened earlier in this run of the app, before the main UI showed.
let loginShown = false;
let openedFromOutside = false;

/** The login screen showed in this run: a set-up page may follow it. */
export const noteLoginShown = () => {
  loginShown = true;
};

/**
 * A notification, widget row, link or Spotlight result opened the app (or
 * something in it): no sheet covers what it opened.
 */
export const noteOpenedFromOutside = () => {
  openedFromOutside = true;
};

/** For tests. */
export const resetLaunchNotes = () => {
  loginShown = false;
  openedFromOutside = false;
};

export type LaunchSheet = 'Setup' | 'WhatsNew';

/**
 * Which sheet the main UI opens with, if any. The set-up page follows the
 * first login; an install that was logged in already (an update) skips it.
 * What's New shows for the newest release since the one last seen
 * (`whatsNewSince`), unless the app was opened from outside.
 */
export const pickLaunchSheet = ({
  setupSeen,
  loginShown: afterLogin,
  openedFromOutside: fromOutside,
  hasWhatsNew,
}: {
  setupSeen: boolean;
  loginShown: boolean;
  openedFromOutside: boolean;
  hasWhatsNew: boolean;
}): LaunchSheet | null => {
  if (!setupSeen && afterLogin) {
    return 'Setup';
  }
  if (fromOutside) {
    return null;
  }
  return hasWhatsNew ? 'WhatsNew' : null;
};

// Lets Today draw and a tap that launched the app arrive first.
const delay = 1000;

/**
 * Opens the set-up page or What's New once the main UI has shown (see
 * `pickLaunchSheet`). Each marks itself seen when it opens.
 */
const useLaunchSheet = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParams>>();

  const open = useEffectEvent(() => {
    const { setupSeen, whatsNewSeenVersion } = useAppStateStore.getState();
    const context = whatsNewContext();
    const whatsNew = whatsNewSince(whatsNewSeenVersion, context);
    const sheet = pickLaunchSheet({
      setupSeen,
      loginShown,
      openedFromOutside,
      hasWhatsNew: !!whatsNew,
    });
    if (!setupSeen && !loginShown) {
      // Logged in before this version: an update, not a new user.
      setSetupSeen();
    }
    if (sheet === 'Setup') {
      navigation.navigate('Setup');
    } else if (sheet === 'WhatsNew' && whatsNew) {
      navigation.navigate('WhatsNewStack', {
        screen: 'WhatsNew',
        params: { version: whatsNew.version },
      });
    }
  });

  useEffect(() => {
    const timer = setTimeout(open, delay);
    return () => clearTimeout(timer);
  }, []);
};

export default useLaunchSheet;
