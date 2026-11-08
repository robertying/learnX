import { useState } from 'react';
import { getAuth, useLoggedIn, useLoggingIn } from 'data/auth';
import { login } from 'data/login';
import { toast } from 'components/Toast';
import { t } from 'helpers/i18n';

/** What a list's refetch resolves to; only whether it failed matters. */
type RefreshResult = { isError: boolean } | void;

/**
 * Pull to refresh for a list: refetches while logged in, and says so when
 * that fails (refreshes the app starts itself don't). With no session
 * (offline, or a failed login) it logs in again with the saved login instead,
 * showing the spinner until the login ends; the lists refetch on their own
 * once it succeeds, and the status line above them reports a failure.
 */
const usePullToRefresh = (
  refresh: () => Promise<RefreshResult> | RefreshResult,
  fetching: boolean,
) => {
  const loggedIn = useLoggedIn();
  const loggingIn = useLoggingIn();
  const [pulled, setPulled] = useState(false);

  if (pulled && !loggingIn) {
    setPulled(false);
  }

  const onRefresh = async () => {
    if (loggedIn) {
      const result = await refresh();
      if (result?.isError) {
        toast(t('refreshFailed'), 'error');
      }
    } else if (!getAuth().loggingIn) {
      setPulled(true);
      login({ reset: true });
    }
  };

  return { refreshing: fetching || (pulled && loggingIn), onRefresh };
};

export default usePullToRefresh;
