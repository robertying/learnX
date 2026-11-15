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
 * starts with the next launch. Coming back after `OTA_AWAY_MS` or more in the
 * background starts an update that is waiting (as if the system had ended the
 * app meanwhile), or else checks for one in the background. Resolves true when
 * an update is starting: `hooks/useReLogin`, which handles coming back, then
 * leaves the session and the lists to the app the update starts, rather than
 * begin a login and fetches that the reload would cut off.
 */
export const updateOnReturn = async (
  awayMs: number,
  updatePending: boolean,
) => {
  if (!Updates.isEnabled || awayMs < OTA_AWAY_MS) {
    return false;
  }
  if (!updatePending) {
    void fetchUpdate();
    return false;
  }
  try {
    await Updates.reloadAsync();
    return true;
  } catch {
    // Carry on with the running bundle; the update starts at the next launch.
    return false;
  }
};
