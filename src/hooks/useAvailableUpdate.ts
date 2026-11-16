import { useQuery } from '@tanstack/react-query';
import { nativeApplicationVersion } from 'expo-application';
import semverGt from 'semver/functions/gt';
import Updater from 'modules/updater';
import { getLatestRelease } from 'helpers/update';

/**
 * A newer Android release on the TUNA mirror, or null. Only the APKs check
 * (`modules/updater`): the Google Play build and iOS are updated by their
 * stores. Compared with the
 * installed app's own version, not the JS bundle's, which an over-the-air
 * update can change. Checked at most once a day; offline or with the mirror
 * down, there's simply none.
 */
const useAvailableUpdate = () => {
  const { data } = useQuery({
    queryKey: ['latestRelease'],
    queryFn: getLatestRelease,
    enabled: Updater?.isSupported ?? false,
    staleTime: 24 * 60 * 60 * 1000,
  });
  return data &&
    nativeApplicationVersion &&
    semverGt(data.version, nativeApplicationVersion)
    ? data
    : null;
};

export default useAvailableUpdate;
