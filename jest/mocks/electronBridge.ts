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
    menu: jest.fn(async () => null),
    secrets: {
      get: jest.fn(async () => null),
      set: jest.fn(async () => {}),
      remove: jest.fn(async () => {}),
    },
    files: {
      sync: jest.fn(),
      download: jest.fn(async () => ({ status: 200 })),
      abortDownload: jest.fn(),
      onProgress: jest.fn(),
    },
    webviews: {
      configure: jest.fn(async () => true),
      onAsk: jest.fn(),
      answer: jest.fn(),
      loadHtml: jest.fn(async () => true),
    },
    appInfo: jest.fn(() => ({ version: '19.0.0', build: '4544' })),
    updates: {
      pending: jest.fn(() => null),
      onReady: jest.fn(),
      install: jest.fn(),
    },
    shell: {
      open: jest.fn(async () => ''),
      showInFolder: jest.fn(async () => {}),
      saveAs: jest.fn(async () => null),
      saveText: jest.fn(async () => null),
      pickDirectory: jest.fn(async () => null),
      pickFiles: jest.fn(async () => null),
      copyText: jest.fn(async () => {}),
    },
    notifications: {
      supported: jest.fn(async () => true),
      schedule: jest.fn(async request => request.identifier),
      cancel: jest.fn(async () => {}),
      list: jest.fn(async () => []),
      onResponse: jest.fn(),
      onDevShown: jest.fn(),
    },
    background: {
      start: jest.fn(async () => {}),
      onRun: jest.fn(),
    },
    loginItem: {
      get: jest.fn(async () => ({ supported: true, enabled: false })),
      set: jest.fn(async () => true),
    },
    desktop: {
      setLabels: jest.fn(async () => {}),
      takeOpen: jest.fn(async () => null),
      onOpen: jest.fn(),
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
