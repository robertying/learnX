import { useSettings } from 'data/settings';
import useAvailableUpdate from 'hooks/useAvailableUpdate';
import packageJson from '../../package.json';

/**
 * Whether Settings has something new to show: the changelog of this version,
 * an update, or course information sharing not seen yet.
 */
const useSettingsBadge = () => {
  const newChangelog = useSettings(
    settings => settings.lastShowChangelogVersion !== packageJson.version,
  );
  const newUpdate = !!useAvailableUpdate();
  const courseInformationSharingBadgeShown = useSettings(
    settings => settings.courseInformationSharingBadgeShown,
  );
  return newChangelog || newUpdate || !courseInformationSharingBadgeShown;
};

export default useSettingsBadge;
