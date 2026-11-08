import { useEffect, useEffectEvent } from 'react';
import Spotlight, { SpotlightOpenedItem } from '../../modules/spotlight';
import { useAssignments, useNotices } from 'data/content';
import { useUserData } from 'data/userData';
import { updateSpotlight } from 'helpers/spotlight';
import useOpenTarget from 'hooks/useOpenTarget';

/**
 * Keeps the current semester's notices and assignments in Spotlight (iOS and
 * Mac) as they're refreshed or their courses hidden, and opens the item of a
 * tapped search result, including the one that launched the app.
 */
const useSpotlight = () => {
  const { data: notices } = useNotices();
  const { data: assignments } = useAssignments();
  const hiddenCourses = useUserData(data => data.hiddenCourses);
  const archived = useUserData(data => data.archived.assignment);

  useEffect(() => {
    updateSpotlight({ notices, assignments }, { hiddenCourses, archived });
  }, [notices, assignments, hiddenCourses, archived]);

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
