import { useEffect, useState } from 'react';
import { useAuthStore, type AuthState } from 'data/auth';
import { hasSavedLogin } from 'data/credentials';
import { syncWebViewCookies } from 'helpers/webViewCookies';

/**
 * How long content waits for a login under way before it shows anyway (the
 * server may not answer). It still loads again once the login is through.
 */
export const LOGIN_WAIT_MS = 10_000;

/**
 * Whether a session is on its way: a login is under way, or, with a saved
 * login, none has opened or failed yet, as at launch before the launch login
 * starts (a widget or notification can open a detail screen first).
 */
const isLoginPending = (state: AuthState) =>
  state.loggingIn ||
  (!state.loggedIn &&
    state.failure === null &&
    !state.reloginRequested &&
    hasSavedLogin());

/**
 * The CSRF token for web content (a notice's body, an assignment's
 * description), or null while it should wait. Content that loads from Web
 * Learning (`needed`, images the editor uploaded, say) needs the session:
 * it waits for a login under way, up to `LOGIN_WAIT_MS`, and after every
 * login, thu-learn-lib's own for an expired session too, the token changes
 * once the new cookies are in the web views' store, so the content loads
 * again with them. Content that doesn't load from Web Learning never waits,
 * and keeps the token it opened with rather than loading again: its links
 * open outside the app, where the session doesn't go anyway.
 */
const useWebSession = (needed: boolean) => {
  const token = useAuthStore(state => state.sessionToken);
  const [openedWith] = useState(token);
  const pending = useAuthStore(isLoginPending);
  const [waitedLongEnough, setWaitedLongEnough] = useState(false);
  const [synced, setSynced] = useState<string | null>(null);
  const waiting = needed && pending && !waitedLongEnough;

  useEffect(() => {
    if (!waiting) {
      return;
    }
    const timer = setTimeout(() => setWaitedLongEnough(true), LOGIN_WAIT_MS);
    return () => clearTimeout(timer);
  }, [waiting]);

  useEffect(() => {
    if (!needed || waiting) {
      return;
    }
    let current = true;
    void syncWebViewCookies().then(() => {
      if (current) {
        setSynced(token);
      }
    });
    return () => {
      current = false;
    };
  }, [needed, waiting, token]);

  return needed ? synced : openedWith;
};

export default useWebSession;
