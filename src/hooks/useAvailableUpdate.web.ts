import { useSyncExternalStore } from 'react';
import type { Release } from 'helpers/update';
import {
  pendingUpdate,
  releaseUrl,
  subscribeToUpdates,
} from 'services/electronUpdates';

/**
 * The Electron app's update, once it has downloaded in the background
 * (electron/updater.cjs), or null: Settings shows it on top, as the APKs'
 * update, and installing it only takes a restart (`useUpdateInstaller`).
 */
const useAvailableUpdate = (): Release | null => {
  const update = useSyncExternalStore(subscribeToUpdates, pendingUpdate);
  return update
    ? { version: update.version, url: releaseUrl(update.version) }
    : null;
};

export default useAvailableUpdate;
