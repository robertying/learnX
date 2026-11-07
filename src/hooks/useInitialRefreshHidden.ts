import { useState } from 'react';

/**
 * `refreshing`, except false during the first fetch, so the pull-to-refresh
 * spinner doesn't show while the list loads for the first time.
 */
const useInitialRefreshHidden = (refreshing: boolean) => {
  const [firstFetch, setFirstFetch] = useState<'pending' | 'running' | 'done'>(
    'pending',
  );
  if (firstFetch === 'pending' && refreshing) {
    setFirstFetch('running');
  } else if (firstFetch === 'running' && !refreshing) {
    setFirstFetch('done');
  }
  return firstFetch === 'done' ? refreshing : false;
};

export default useInitialRefreshHidden;
