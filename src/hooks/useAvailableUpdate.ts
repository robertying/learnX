import { Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { nativeApplicationVersion } from 'expo-application';
import semverGt from 'semver/functions/gt';
import { getLatestRelease } from 'helpers/update';

/**
 * A newer Android release on the TUNA mirror, or null. Compared with the
 * installed app's own version, not the JS bundle's, which an over-the-air
 * update can change. Checked at most once a day; offline or with the mirror
 * down, there's simply none.
 */
const useAvailableUpdate = () => {
  const { data } = useQuery({
    queryKey: ['latestRelease'],
    queryFn: getLatestRelease,
    enabled: Platform.OS === 'android',
    staleTime: 24 * 60 * 60 * 1000,
  });
  return data &&
    nativeApplicationVersion &&
    semverGt(data.version, nativeApplicationVersion)
    ? data
    : null;
};

export default useAvailableUpdate;
