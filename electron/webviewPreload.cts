// The preload of every web view the app shows (webviews.ts): what a React
// Native web view gives a page. `window.ReactNativeWebView.postMessage`
// sends a message to the app's page, and the app's scripts for this web view
// run in the page's own world, one before its scripts and one once the
// document has loaded (`injectedJavaScriptBeforeContentLoaded`,
// `injectedJavaScript`).
//
// CommonJS, as a sandboxed preload must be, and run without its types
// (preloads.ts strips them).
import type { Scripts } from './webviews.ts';

const {
  contextBridge,
  ipcRenderer,
  webFrame,
}: typeof import('electron') = require('electron');

const scripts: Scripts = ipcRenderer.sendSync('webview:scripts') ?? {};

contextBridge.exposeInMainWorld('ReactNativeWebView', {
  postMessage: (data: unknown) =>
    ipcRenderer.sendToHost('message', String(data)),
});

const run = (code: string | undefined) => {
  if (code) {
    // In the page's world, past its content security policy.
    webFrame.executeJavaScript(code).catch(() => {});
  }
};

run(scripts.before);
if (scripts.after) {
  globalThis.addEventListener('DOMContentLoaded', () => run(scripts.after), {
    once: true,
  });
}
