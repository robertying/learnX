import useLinkTaps from 'hooks/useLinkTaps';
import useNotificationTaps from 'hooks/useNotificationTaps';
import useSpotlightTaps from 'hooks/useSpotlightTaps';

/**
 * Opens what the user tapped outside the app: a notification, a widget row or
 * another learnx:// link, or a Spotlight result, including the one that
 * launched the app. Each goes through `useOpenTarget`, which shows the item's
 * list and leaves the item to it (`usePendingTarget`).
 */
const useIncomingTargets = () => {
  useNotificationTaps();
  useLinkTaps();
  useSpotlightTaps();
};

export default useIncomingTargets;
