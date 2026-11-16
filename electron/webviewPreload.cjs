// The preload of every web view the app shows (webviews.cjs): what a React
// Native web view gives a page. `window.ReactNativeWebView.postMessage`
// sends a message to the app's page, and the app's scripts for this web view
// run in the page's own world, one before its scripts and one once the
// document has loaded (`injectedJavaScriptBeforeContentLoaded`,
// `injectedJavaScript`).
const { contextBridge, ipcRenderer, webFrame } = require('electron');

/** @type {{ before?: string, after?: string }} */
const scripts = ipcRenderer.sendSync('webview:scripts') ?? {};

contextBridge.exposeInMainWorld('ReactNativeWebView', {
  postMessage: (/** @type {unknown} */ data) =>
    ipcRenderer.sendToHost('message', String(data)),
});

const run = (/** @type {string | undefined} */ code) => {
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
