import { resetContentOverrides } from 'data/content';
import { clearQueryCache } from 'data/queryClient';
import { setDataOwner } from 'data/dataOwner';
import { NOTIFIED_KEY, resetNotified } from 'data/notified';
import { resetServerActions } from 'data/serverActions';
import { resetSettings, SETTINGS_KEY } from 'data/settings';
import {
  clearSubmissionDrafts,
  SUBMISSION_DRAFTS_KEY,
} from 'data/submissionDrafts';
import { resetSyncLog, SYNC_LOG_KEY } from 'data/syncLog';
import { resetUserData, USER_DATA_KEY, UserData } from 'data/userData';
import { removeFileDir } from 'helpers/fs';
import { clearSurfaces } from 'helpers/surfaces';

/**
 * Every persisted store, by its storage key, with how to empty it. All of
 * them belong to the account whose data this is (`data/dataOwner`), so they
 * go together on logout or when someone else logs in. A test checks that
 * every `persist` store in `src/data` is listed here: a new store must say
 * how it's reset.
 */
export const accountStores = {
  [SETTINGS_KEY]: resetSettings,
  [USER_DATA_KEY]: resetUserData,
  [NOTIFIED_KEY]: resetNotified,
  [SYNC_LOG_KEY]: resetSyncLog,
  [SUBMISSION_DRAFTS_KEY]: clearSubmissionDrafts,
} satisfies Record<string, () => void>;

/**
 * Forgets everything kept for the account whose data this is: the stores
 * above (the user data replaced by `userData` when given, e.g. the mock
 * account's), the server cache, the server actions sent and the items marked read this
 * session, the
 * data's owner, the downloaded files, and what the widgets, Spotlight and
 * reminders show. The login itself is left alone. Resolves once the reminders
 * are cancelled and the files deleted.
 */
export function clearAccountData(userData?: UserData) {
  Object.entries(accountStores).forEach(([key, reset]) =>
    key === USER_DATA_KEY ? resetUserData(userData) : reset(),
  );
  resetServerActions();
  resetContentOverrides();
  clearQueryCache();
  setDataOwner(null);
  return Promise.all([clearSurfaces(), removeFileDir().catch(() => {})]).then(
    () => {},
  );
}
