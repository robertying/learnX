import { useEffect, useEffectEvent, useRef } from 'react';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';

/**
 * How long the app has to have been in the background before coming back
 * checks for an update, or starts one that is waiting.
 */
export const OTA_AWAY_MS = 60 * 60 * 1000;

/** Downloads an update if there is one. Errors (offline, server down) are ignored. */
const fetchUpdate = async () => {
  try {
    const { isAvailable } = await Updates.checkForUpdateAsync();
    if (isAvailable) {
      await Updates.fetchUpdateAsync();
    }
  } catch {
    // The next check tries again.
  }
};

/**
 * Keeps the JS bundle current without interrupting anyone. The native side
 * checks on every cold launch and downloads in the background; the update then
 * starts with the next launch. When the app comes back after an hour or more
 * in the background, this starts an update that is waiting (as if the system
 * had ended the app meanwhile), or else checks for one.
 */
const useOtaUpdate = () => {
  const { isUpdatePending } = Updates.useUpdates();
  const backgroundSince = useRef<number | null>(null);

  const onReturn = useEffectEvent(() => {
    if (isUpdatePending) {
      Updates.reloadAsync().catch(() => {});
    } else {
      void fetchUpdate();
    }
  });

  useEffect(() => {
    if (!Updates.isEnabled) {
      return;
    }
    const sub = AppState.addEventListener('change', state => {
      if (state === 'background') {
        backgroundSince.current ??= Date.now();
      } else if (state === 'active' && backgroundSince.current !== null) {
        const away = Date.now() - backgroundSince.current;
        backgroundSince.current = null;
        if (away >= OTA_AWAY_MS) {
          onReturn();
        }
      }
    });
    return () => sub.remove();
  }, []);
};

export default useOtaUpdate;
