import { useEffect, useEffectEvent } from 'react';
import Spotlight, { SpotlightOpenedItem } from 'modules/spotlight';
import { isItemType } from 'helpers/openTarget';
import useOpenTarget from 'hooks/useOpenTarget';
import { useWindow } from 'hooks/useWindow';
import { isTargetWindow } from 'services/windows';

/**
 * Opens the item of a tapped Spotlight result (iOS and Mac), including the one
 * that launched the app. services/surfaces keeps the index current.
 */
const useSpotlightTaps = () => {
  const openTarget = useOpenTarget();
  const open = useEffectEvent(({ domain, id }: SpotlightOpenedItem) => {
    if (isItemType(domain)) {
      openTarget({ type: domain, id });
    }
  });

  const { windowId } = useWindow();

  useEffect(() => {
    if (!Spotlight) {
      return;
    }
    // Every window hears of the tap; the one it was delivered to opens it.
    const subscription = Spotlight.addListener('onOpenItem', item => {
      if (isTargetWindow(windowId)) {
        open(item);
      }
    });
    const launchedWith = Spotlight.takeOpenedItem();
    if (launchedWith) {
      open(launchedWith);
    }
    return () => subscription.remove();
  }, [windowId]);
};

export default useSpotlightTaps;
