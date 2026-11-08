import { useState } from 'react';
import { getAuth, useLoggedIn, useLoggingIn } from 'data/auth';
import { login } from 'data/login';

/**
 * Pull to refresh for a list: refetches while logged in, and logs in again
 * with the saved login when there's no session (offline, or a failed login),
 * showing the spinner until the login ends. The lists refetch on their own
 * once it succeeds.
 */
const usePullToRefresh = (refresh: () => void, fetching: boolean) => {
  const loggedIn = useLoggedIn();
  const loggingIn = useLoggingIn();
  const [pulled, setPulled] = useState(false);

  if (pulled && !loggingIn) {
    setPulled(false);
  }

  const onRefresh = () => {
    if (loggedIn) {
      refresh();
    } else if (!getAuth().loggingIn) {
      setPulled(true);
      login({ reset: true });
    }
  };

  return { refreshing: fetching || (pulled && loggingIn), onRefresh };
};

export default usePullToRefresh;
