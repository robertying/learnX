import { useEffect, useState } from 'react';
import { importLegacyUserData } from 'data/legacy';
import { loadCredentials } from 'data/credentials';
import { restoreQueryCache } from 'data/queryClient';

/**
 * Loads what the first screen needs: the saved login, the user data saved by
 * 18.0.x, and the cached server data.
 */
const loadStores = () =>
  Promise.all([loadCredentials(), importLegacyUserData(), restoreQueryCache()]);

/** Whether the stores the first screen reads have loaded. */
const useStoresLoaded = () => {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    void loadStores().finally(() => setLoaded(true));
  }, []);
  return loaded;
};

export default useStoresLoaded;
