import { useAppState } from 'data/appState';
import useAvailableUpdate from 'hooks/useAvailableUpdate';
import packageJson from '../../package.json';

/**
 * Whether Settings has something new to show: the changelog of this version,
 * an update, or course information sharing not seen yet.
 */
const useSettingsBadge = () => {
  const newChangelog = useAppState(
    state => state.changelogSeenVersion !== packageJson.version,
  );
  const newUpdate = !!useAvailableUpdate();
  const courseSharingSeen = useAppState(state => state.courseSharingSeen);
  return newChangelog || newUpdate || !courseSharingSeen;
};

export default useSettingsBadge;
