import { useContext } from 'react';
import {
  NavigationContext,
  NavigationRouteContext,
} from '@react-navigation/native';
import DeviceInfo from 'constants/DeviceInfo';
import { Platform } from 'react-native';

/** The strip along a screen's leading edge that iOS's swipe back starts in */
export const backSwipeEdgeWidth = 20;

/**
 * Whether a swipe from the leading edge of the caller's screen goes back: on
 * iPhone and iPad, in a screen pushed over another in its stack. A
 * horizontal pan in the screen (a card's swipe actions) starts sooner than
 * the swipe back and would take it, so it leaves that strip alone, as table
 * rows do. Android's back gesture comes from the system, outside the app.
 */
const useBackSwipeEdge = () => {
  const navigation = useContext(NavigationContext);
  const route = useContext(NavigationRouteContext);
  if (Platform.OS !== 'ios' || DeviceInfo.isMac() || !navigation || !route) {
    return false;
  }
  const state = navigation.getState();
  if (state.type !== 'stack') {
    return false;
  }
  return state.routes.findIndex(r => r.key === route.key) > 0;
};

export default useBackSwipeEdge;
