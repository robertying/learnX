import { bridge } from 'web/bridge';

/**
 * Stands in for expo-secure-store in the Electron app: values are encrypted
 * with Electron's safeStorage in the main process (electron/secrets.ts).
 * The keychain options have no meaning there and are ignored.
 */
export type SecureStoreOptions = Record<string, unknown>;

export const AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY = 0;

export const getItemAsync = (key: string) => bridge().secrets.get(key);

export const setItemAsync = (key: string, value: string) =>
  bridge().secrets.set(key, value);

export const deleteItemAsync = (key: string) => bridge().secrets.remove(key);
