const mockExpose = jest.fn();
const mockSendSync = jest.fn();
const mockSendToHost = jest.fn();
const mockExecute = jest.fn(async () => undefined);

jest.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: mockExpose },
  ipcRenderer: { sendSync: mockSendSync, sendToHost: mockSendToHost },
  webFrame: { executeJavaScript: mockExecute },
}));

/** Loads the preload in a page, whose events the test sends. */
const load = (scripts: unknown) => {
  mockSendSync.mockReturnValue(scripts);
  const page = new EventTarget();
  Object.assign(globalThis, {
    addEventListener: page.addEventListener.bind(page),
  });
  jest.isolateModules(() => {
    require('../webviewPreload.cjs');
  });
  return page;
};

afterEach(() => {
  delete (globalThis as { addEventListener?: unknown }).addEventListener;
});

it('gives the page postMessage, sending to the app', () => {
  load({});
  expect(mockSendSync).toHaveBeenCalledWith('webview:scripts');
  const [name, api] = mockExpose.mock.calls[0];
  expect(name).toBe('ReactNativeWebView');
  api.postMessage(42);
  expect(mockSendToHost).toHaveBeenCalledWith('message', '42');
});

it("runs the app's scripts before the page's and once it has loaded", () => {
  const page = load({ before: 'early()', after: 'late()' });
  expect(mockExecute.mock.calls).toEqual([['early()']]);
  page.dispatchEvent(new Event('DOMContentLoaded'));
  page.dispatchEvent(new Event('DOMContentLoaded'));
  expect(mockExecute.mock.calls).toEqual([['early()'], ['late()']]);
});

it('runs nothing without scripts', () => {
  const page = load(undefined);
  page.dispatchEvent(new Event('DOMContentLoaded'));
  expect(mockExecute).not.toHaveBeenCalled();
});
