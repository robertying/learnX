import * as SecureStore from 'web/secureStore';
import type { Bridge } from 'web/bridge';
import {
  installBridge,
  uninstallBridge,
} from 'test-utils/mocks/electronBridge';

let bridge: Bridge;

beforeEach(() => {
  bridge = installBridge();
});

afterEach(uninstallBridge);

it('keeps secrets in the main process', async () => {
  jest.mocked(bridge.secrets.get).mockResolvedValue('{"username":"a"}');
  expect(await SecureStore.getItemAsync('credentials')).toBe(
    '{"username":"a"}',
  );
  await SecureStore.setItemAsync('credentials', 'x');
  expect(bridge.secrets.set).toHaveBeenCalledWith('credentials', 'x');
  await SecureStore.deleteItemAsync('credentials');
  expect(bridge.secrets.remove).toHaveBeenCalledWith('credentials');
});

it('has the keychain option the app names', () => {
  expect(SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY).toBeDefined();
});
