import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearCredentials } from 'data/credentials';
import {
  LEGACY_IMPORTED_KEY,
  LEGACY_ROOT_KEY,
  LEGACY_SETTINGS_KEY,
} from 'data/legacy';
import { kvStorage } from 'data/storage';

/** Set in the key-value store on the first launch of an install. */
export const INSTALLED_KEY = 'installed';

/**
 * Whether this is the first launch after an install, as opposed to an
 * update. The key-value store and AsyncStorage go with the app when it's
 * deleted, so an install has neither this key, nor the mark of the legacy
 * import (set by every build since 19.0), nor 18.0.x's saved data. Marks
 * the install, so it's true once. Call it before `importLegacyUserData`.
 */
export const checkFirstLaunch = async () => {
  if (kvStorage.getItem(INSTALLED_KEY)) {
    return false;
  }
  const ranBefore =
    !!kvStorage.getItem(LEGACY_IMPORTED_KEY) ||
    (await AsyncStorage.multiGet([LEGACY_ROOT_KEY, LEGACY_SETTINGS_KEY])).some(
      ([, value]) => !!value,
    );
  kvStorage.setItem(INSTALLED_KEY, '1');
  return !ranBefore;
};

/**
 * The iOS keychain keeps a login after the app is deleted. A new install
 * starts logged out, with the welcome page, instead of picking it up.
 */
export const forgetLoginAfterReinstall = async () => {
  if (await checkFirstLaunch()) {
    await clearCredentials();
  }
};
