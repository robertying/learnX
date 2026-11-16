// What the app's web build may ask of the main process (main.cjs), as
// `window.learnx`: the page runs sandboxed and context-isolated, without Node.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('learnx', {
  platform: process.platform,
  fetch: (id, req) => ipcRenderer.invoke('fetch', id, req),
  abortFetch: id => ipcRenderer.send('fetch:abort', id),
  cookies: {
    get: url => ipcRenderer.invoke('cookies:get', url),
    set: details => ipcRenderer.invoke('cookies:set', details),
    remove: (url, name) => ipcRenderer.invoke('cookies:remove', url, name),
    flush: () => ipcRenderer.invoke('cookies:flush'),
    clearAll: () => ipcRenderer.invoke('cookies:clearAll'),
  },
  storage: {
    load: db => ipcRenderer.sendSync('storage:load', db),
    set: (db, key, value) => ipcRenderer.send('storage:set', db, key, value),
    remove: (db, key) => ipcRenderer.send('storage:remove', db, key),
    clear: db => ipcRenderer.send('storage:clear', db),
  },
  menu: (items, position) => ipcRenderer.invoke('menu:popup', items, position),
  secrets: {
    get: key => ipcRenderer.invoke('secrets:get', key),
    set: (key, value) => ipcRenderer.invoke('secrets:set', key, value),
    remove: key => ipcRenderer.invoke('secrets:remove', key),
  },
  files: {
    sync: (op, ...args) => ipcRenderer.sendSync('files', op, ...args),
    download: (id, req) => ipcRenderer.invoke('files:download', id, req),
    abortDownload: id => ipcRenderer.send('files:abortDownload', id),
    onProgress: listener => {
      ipcRenderer.on('files:progress', (_event, id, written, total) =>
        listener(id, written, total),
      );
    },
  },
  webviews: {
    configure: (guestId, scripts) =>
      ipcRenderer.invoke('webview:configure', guestId, scripts),
    onAsk: listener => {
      ipcRenderer.on('webview:ask', (_event, request) => listener(request));
    },
    answer: (requestId, allow) =>
      ipcRenderer.send('webview:answer', requestId, allow),
  },
  // Development only: the dev runner's launch options (empty otherwise), and
  // a window capture, which main.cjs saves when the dev runner asks for them
  // and returns null otherwise.
  launchOptions: () => ipcRenderer.sendSync('launchOptions'),
  capture: name => ipcRenderer.invoke('capture', name),
});
