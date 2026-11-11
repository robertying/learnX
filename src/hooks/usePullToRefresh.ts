import { useState } from 'react';
import { getAuth, useLoggedIn, useLoggingIn } from 'data/auth';
import { login } from 'data/login';
import { toast } from 'components/Toast';
import { t } from 'helpers/i18n';

/** What a list's refetch resolves to; only whether it failed matters. */
type RefreshResult = { isError: boolean } | void;

/**
 * Pull to refresh for a list: refetches while logged in, and says so when
 * that fails. With no session (offline, or a failed login) it logs in again
 * with the saved login instead; the lists refetch on their own once it
 * succeeds, and the status line above them reports a failure.
 *
 * `refreshing` is true only for a refresh the user started, until it ends.
 * Fetches the app starts itself (at launch, on returning to the app, when
 * another screen mounts the same list) show no spinner: setting a
 * RefreshControl refreshing from code on iOS pulls the list down under the
 * large title, and if it ends while the list is off screen the list can stay
 * pulled down.
 */
const usePullToRefresh = (
  refresh: () => Promise<RefreshResult> | RefreshResult,
) => {
  const loggedIn = useLoggedIn();
  const loggingIn = useLoggingIn();
  const [refreshing, setRefreshing] = useState(false);
  const [pulled, setPulled] = useState(false);

  if (pulled && !loggingIn) {
    setPulled(false);
  }

  const onRefresh = async () => {
    if (loggedIn) {
      setRefreshing(true);
      try {
        const result = await refresh();
        if (result?.isError) {
          toast(t('refreshFailed'), 'error');
        }
      } finally {
        setRefreshing(false);
      }
    } else if (!getAuth().loggingIn) {
      setPulled(true);
      void login({ reset: true });
    }
  };

  return { refreshing: refreshing || (pulled && loggingIn), onRefresh };
};

export default usePullToRefresh;
