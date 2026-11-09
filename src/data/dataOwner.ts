import Storage from 'expo-sqlite/kv-store';

export const DATA_OWNER_KEY = 'dataOwner';

/**
 * The username the saved data (server cache, user data, settings, drafts)
 * belongs to. Kept apart from the saved login, which some paths forget (the
 * ephemeral mock account, a login that starts over), so a login as someone
 * else can tell the data isn't theirs. Null when nothing has recorded it yet.
 */
export const getDataOwner = () => Storage.getItemSync(DATA_OWNER_KEY) || null;

export const setDataOwner = (username: string | null) => {
  if (username) {
    Storage.setItemSync(DATA_OWNER_KEY, username);
  } else {
    Storage.removeItemSync(DATA_OWNER_KEY);
  }
};
