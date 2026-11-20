import { useEffect, useEffectEvent } from 'react';
import { Linking } from 'react-native';
import { getUrlTarget } from 'helpers/openTarget';
import useOpenTarget from 'hooks/useOpenTarget';
import { applyMockNetworkLink } from 'services/launchOptions';
import { isTargetWindow, takeReloadLink } from 'services/windows';
import { useWindow } from 'hooks/useWindow';

/**
 * The link that launched the app (or a window) stays its initial URL for as
 * long as the app runs; it's opened once, not again on a later mount (e.g.
 * after logging in again). By window id; the empty string where there's only
 * one window.
 */
const initialUrlHandled = new Set<string>();

/**
 * Opens learnx:// links: those of tapped widget rows (the assignment's detail,
 * or the list) and of calendar events and reminders (an assignment, a course
 * or Today). Handles the link that launched the app as well as links while it
 * runs, and after an over-the-air update reloaded the JS, what the window
 * showed before (`takeReloadLink`), and in debug and E2E builds the mock network link
 * (`applyMockNetworkLink`). Other learnx:// links (the share extension's) are
 * left alone.
 */
const useLinkTaps = () => {
  const open = useEffectEvent(useOpenTarget());
  const { windowId, initialURL } = useWindow();

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

    if (!initialUrlHandled.has(windowId ?? '')) {
      initialUrlHandled.add(windowId ?? '');
      const reloaded = takeReloadLink(windowId);
      if (reloaded) {
        handle(reloaded);
      } else if (windowId) {
        // A window of its own (iPad, Mac) is told its link by the scene
        // delegate: React Native only knows the one that launched the app.
        handle(initialURL);
      } else {
        Linking.getInitialURL()
          .then(handle)
          .catch(() => {});
      }
    }
    // Every window hears every link; the one it was delivered to opens it.
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (isTargetWindow(windowId)) {
        handle(url);
      }
    });
    return () => subscription.remove();
  }, [windowId, initialURL]);
};

export default useLinkTaps;
