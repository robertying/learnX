import { bridge } from 'web/bridge';
import {
  installBridge,
  uninstallBridge,
} from 'test-utils/mocks/electronBridge';

afterEach(uninstallBridge);

it('throws outside the Electron app', () => {
  expect(() => bridge()).toThrow('Not running in the learnX Electron app');
});

it('returns the preload bridge', () => {
  const installed = installBridge();
  expect(bridge()).toBe(installed);
});
