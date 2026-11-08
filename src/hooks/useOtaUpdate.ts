import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';
import { toast } from 'components/Toast';
import { t } from 'helpers/i18n';

/** How often coming back to the foreground checks for an update. */
export const foregroundCheckInterval = 60 * 60 * 1000;

let lastCheck = Date.now();

/**
 * Checks for an over-the-air update and downloads it. Errors (offline, server
 * down) are ignored: the app keeps running the update it has.
 */
export const checkForOtaUpdate = async () => {
  lastCheck = Date.now();
  try {
    const { isAvailable } = await Updates.checkForUpdateAsync();
    if (isAvailable) {
      await Updates.fetchUpdateAsync();
    }
  } catch {
    // Nothing to do; the next check tries again.
  }
};

const restart = () => {
  Updates.reloadAsync().catch(() => {});
};

/**
 * Keeps the JS bundle current. The native side checks on every cold launch;
 * this also checks when the app returns to the foreground (at most hourly),
 * and offers a restart once a downloaded update is waiting. If the user
 * ignores it, the update loads on the next cold launch.
 */
const useOtaUpdate = () => {
  const { isUpdatePending, downloadedUpdate } = Updates.useUpdates();
  const pendingId = isUpdatePending ? downloadedUpdate?.updateId : undefined;

  useEffect(() => {
    if (!Updates.isEnabled) {
      return;
    }
    const subscription = AppState.addEventListener('change', state => {
      if (
        state === 'active' &&
        Date.now() - lastCheck >= foregroundCheckInterval
      ) {
        checkForOtaUpdate();
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (pendingId) {
      toast(t('updateReady'), 'none', 10 * 1000, {
        label: t('restart'),
        onPress: restart,
      });
    }
  }, [pendingId]);
};

export default useOtaUpdate;
