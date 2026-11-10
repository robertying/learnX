import { useAppState } from 'data/appState';
import useAvailableUpdate from 'hooks/useAvailableUpdate';

/**
 * Whether Settings has something new to show: an update, or course
 * information sharing not seen yet.
 */
const useSettingsBadge = () => {
  const newUpdate = !!useAvailableUpdate();
  const courseSharingSeen = useAppState(state => state.courseSharingSeen);
  return newUpdate || !courseSharingSeen;
};

export default useSettingsBadge;
