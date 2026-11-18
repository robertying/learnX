import { useEffect, useEffectEvent } from 'react';
import { Linking } from 'react-native';
import { getUrlTarget } from 'helpers/openTarget';
import useOpenTarget from 'hooks/useOpenTarget';
import { applyMockNetworkLink } from 'services/launchOptions';

/**
 * The link that launched the app stays the initial URL for as long as the app
 * runs; it's opened once, not again on a later mount (e.g. after logging in
 * again).
 */
let initialUrlHandled = false;

/**
 * Opens learnx:// links: those of tapped widget rows (the assignment's detail,
 * or the list) and of calendar events and reminders (an assignment, a course
 * or Today). Handles the link that launched the app as well as links while it
 * runs, and in debug and E2E builds the mock network link
 * (`applyMockNetworkLink`). Other learnx:// links (the share extension's) are
 * left alone.
 */
const useLinkTaps = () => {
  const open = useEffectEvent(useOpenTarget());

  useEffect(() => {
    const handle = (url: string | null | undefined) => {
      if (url && applyMockNetworkLink(url)) {
        return;
      }
      const target = url ? getUrlTarget(url) : null;
      if (target) {
        open(target);
      }
    };

    if (!initialUrlHandled) {
      initialUrlHandled = true;
      Linking.getInitialURL()
        .then(handle)
        .catch(() => {});
    }
    const subscription = Linking.addEventListener('url', ({ url }) =>
      handle(url),
    );
    return () => subscription.remove();
  }, []);
};

export default useLinkTaps;
