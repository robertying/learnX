import {
  useNavigation,
  type NavigatorScreenParams,
} from '@react-navigation/native';
import type { MainTabParams } from 'navigation/types';
import { OpenTarget, targetRoutes } from 'helpers/openTarget';
import { noteOpenedFromOutside } from 'hooks/useLaunchSheet';
import { setPendingTarget } from 'hooks/usePendingTarget';

/**
 * Opens what a tapped notification, widget row or Spotlight result points
 * to: the item's detail, its list, or Today; or the Schedule (the Electron
 * app's Jump List), which Today opens once it's shown.
 */
const useOpenTarget = () => {
  const navigation = useNavigation();

  return (target: OpenTarget) => {
    noteOpenedFromOutside();
    if (target.type === 'today' || target.type === 'schedule') {
      setPendingTarget(
        target.type === 'schedule' ? { type: 'schedule', id: 'week' } : null,
      );
      return navigation.navigate('MainTab', {
        screen: 'TodayStack',
        params: { screen: 'Today', pop: true },
      });
    }
    // The list opens the item, as a tap on it would, so it lands in the
    // detail pane of a split view and on top of the list on a phone.
    setPendingTarget(target.id ? target : null);
    const { tab, list } = targetRoutes[target.type];
    // Each tab with its own list; TypeScript can't pair the two unions.
    return navigation.navigate('MainTab', {
      screen: tab,
      params: { screen: list, pop: true },
    } as NavigatorScreenParams<MainTabParams>);
  };
};

export default useOpenTarget;
