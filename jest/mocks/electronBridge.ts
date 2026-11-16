import type { Bridge } from 'web/bridge';

/**
 * A stand-in for the Electron app's preload bridge (`window.learnx`), with
 * every method a `jest.fn()`. Installs itself as `globalThis.learnx`; tests
 * remove it with `uninstallBridge`.
 */
export const installBridge = (overrides: Partial<Bridge> = {}): Bridge => {
  const bridge: Bridge = {
    platform: 'win32',
    fetch: jest.fn(),
    abortFetch: jest.fn(),
    cookies: {
      get: jest.fn(async () => []),
      set: jest.fn(async () => {}),
      remove: jest.fn(async () => {}),
      flush: jest.fn(async () => {}),
      clearAll: jest.fn(async () => {}),
    },
    storage: {
      load: jest.fn(() => ({})),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    },
    secrets: {
      get: jest.fn(async () => null),
      set: jest.fn(async () => {}),
      remove: jest.fn(async () => {}),
    },
    launchOptions: jest.fn(() => ({})),
    capture: jest.fn(async () => null),
    ...overrides,
  };
  (globalThis as { learnx?: Bridge }).learnx = bridge;
  return bridge;
};

export const uninstallBridge = () => {
  delete (globalThis as { learnx?: Bridge }).learnx;
};
