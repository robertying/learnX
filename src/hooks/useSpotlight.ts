import { useEffect, useEffectEvent } from 'react';
import Spotlight, { SpotlightOpenedItem } from '../../modules/spotlight';
import useOpenTarget from 'hooks/useOpenTarget';

/**
 * Opens the item of a tapped Spotlight result (iOS and Mac), including the one
 * that launched the app. helpers/surfaces keeps the index current.
 */
const useSpotlight = () => {
  const openTarget = useOpenTarget();
  const open = useEffectEvent(({ domain, id }: SpotlightOpenedItem) => {
    if (domain === 'notice' || domain === 'assignment') {
      openTarget({ type: domain, id });
    }
  });

  useEffect(() => {
    if (!Spotlight) {
      return;
    }
    const subscription = Spotlight.addListener('onOpenItem', open);
    const launchedWith = Spotlight.takeOpenedItem();
    if (launchedWith) {
      open(launchedWith);
    }
    return () => subscription.remove();
  }, []);
};

export default useSpotlight;
