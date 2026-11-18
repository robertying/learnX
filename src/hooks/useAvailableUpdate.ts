import { useQuery } from '@tanstack/react-query';
import Updater from 'modules/updater';
import { latestReleaseQuery, UPDATE_CHECK_INTERVAL } from 'data/latestRelease';
import { isNewerRelease } from 'helpers/update';

/**
 * A newer Android release on the TUNA mirror, or null. Only the APKs check
 * (`modules/updater`): the Google Play build and iOS are updated by their
 * stores. Checked again every few hours while open; coming back to the app
 * and the background task check too (`services/updateNotifications`).
 * Offline or with the mirror down, there's simply none.
 */
const useAvailableUpdate = () => {
  const { data } = useQuery({
    ...latestReleaseQuery,
    enabled: Updater?.isSupported ?? false,
    refetchInterval: UPDATE_CHECK_INTERVAL,
  });
  return data && isNewerRelease(data) ? data : null;
};

export default useAvailableUpdate;
