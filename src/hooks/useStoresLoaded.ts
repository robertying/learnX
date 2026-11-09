import { useEffect, useState } from 'react';
import { importLegacyUserData } from 'data/legacy';
import { loadCredentials } from 'data/credentials';
import { restoreQueryCache } from 'data/queryClient';
import { recordError } from 'helpers/crashReporting';

/**
 * Loads what the first screen needs: the saved login, the user data saved by
 * 18.0.x, and the cached server data. Waits for all three even when one
 * fails, so the first screen never reads a store that is still loading; a
 * failed one is reported and starts empty.
 */
const loadStores = async () => {
  const results = await Promise.allSettled([
    loadCredentials(),
    importLegacyUserData(),
    restoreQueryCache(),
  ]);
  for (const result of results) {
    if (result.status === 'rejected') {
      recordError(result.reason, 'Loading stores at launch');
    }
  }
};

/** Whether the stores the first screen reads have loaded. */
const useStoresLoaded = () => {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    void loadStores().finally(() => setLoaded(true));
  }, []);
  return loaded;
};

export default useStoresLoaded;
