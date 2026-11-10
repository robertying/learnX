import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Storage from 'expo-sqlite/kv-store';
import { forgetLoginAfterReinstall, INSTALLED_KEY } from 'data/install';
import { CREDENTIALS_KEY } from 'data/credentials';
import { LEGACY_IMPORTED_KEY, LEGACY_ROOT_KEY } from 'data/legacy';

const keychain: Map<string, string> = (SecureStore as any).__store;
const kv: Map<string, string> = (Storage as any).__store;

beforeEach(async () => {
  keychain.clear();
  kv.clear();
  await AsyncStorage.clear();
  keychain.set(CREDENTIALS_KEY, '{"username":"2020011234"}');
});

describe('forgetLoginAfterReinstall', () => {
  it('drops a login the keychain kept from before a reinstall', async () => {
    await forgetLoginAfterReinstall();
    expect(keychain.has(CREDENTIALS_KEY)).toBe(false);
    expect(kv.get(INSTALLED_KEY)).toBe('1');
  });

  it('keeps the login on later launches', async () => {
    kv.set(INSTALLED_KEY, '1');
    await forgetLoginAfterReinstall();
    expect(keychain.has(CREDENTIALS_KEY)).toBe(true);
  });

  it('keeps the login of an update from 18.0.x', async () => {
    await AsyncStorage.setItem(LEGACY_ROOT_KEY, '{}');
    await forgetLoginAfterReinstall();
    expect(keychain.has(CREDENTIALS_KEY)).toBe(true);
    expect(kv.get(INSTALLED_KEY)).toBe('1');
  });

  it('keeps the login of a build that ran before this check', async () => {
    kv.set(LEGACY_IMPORTED_KEY, '1');
    await forgetLoginAfterReinstall();
    expect(keychain.has(CREDENTIALS_KEY)).toBe(true);
  });
});
