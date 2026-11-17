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
  // The app's version and build number, and the update waiting for a
  // restart (updater.cjs): null until one has downloaded.
  appInfo: () => ipcRenderer.sendSync('app:info'),
  updates: {
    pending: () => ipcRenderer.sendSync('updates:pending'),
    onReady: listener => {
      ipcRenderer.on('updates:ready', (_event, update) => listener(update));
    },
    install: () => ipcRenderer.send('updates:install'),
  },
  // Around the window (desktop.cjs).
  shell: {
    open: uri => ipcRenderer.invoke('shell:open', uri),
    showInFolder: uri => ipcRenderer.invoke('shell:showInFolder', uri),
    saveAs: (uri, name) => ipcRenderer.invoke('shell:saveAs', uri, name),
    saveText: (name, content) =>
      ipcRenderer.invoke('shell:saveText', name, content),
    pickDirectory: () => ipcRenderer.invoke('shell:pickDirectory'),
    pickFiles: options => ipcRenderer.invoke('shell:pickFiles', options),
    copyText: text => ipcRenderer.invoke('shell:copyText', text),
  },
  notifications: {
    supported: () => ipcRenderer.invoke('notifications:supported'),
    schedule: request => ipcRenderer.invoke('notifications:schedule', request),
    cancel: identifier =>
      ipcRenderer.invoke('notifications:cancel', identifier),
    list: () => ipcRenderer.invoke('notifications:list'),
    onResponse: listener => {
      ipcRenderer.on('notifications:response', (_event, request) =>
        listener(request),
      );
    },
    onDevShown: listener => {
      ipcRenderer.on('notifications:devShown', (_event, shown) =>
        listener(shown),
      );
    },
  },
  background: {
    start: minutes => ipcRenderer.invoke('background:start', minutes),
    onRun: listener => {
      ipcRenderer.on('background:run', (_event, options) => listener(options));
    },
  },
  loginItem: {
    get: () => ipcRenderer.invoke('loginItem:get'),
    set: enabled => ipcRenderer.invoke('loginItem:set', enabled),
  },
  desktop: {
    setLabels: labels => ipcRenderer.invoke('desktop:setLabels', labels),
    takeOpen: () => ipcRenderer.invoke('desktop:takeOpen'),
    onOpen: listener => {
      ipcRenderer.on('desktop:open', (_event, target) => listener(target));
    },
  },
  // Development only: the dev runner's launch options (empty otherwise), and
  // a window capture, which main.cjs saves when the dev runner asks for them
  // and returns null otherwise.
  launchOptions: () => ipcRenderer.sendSync('launchOptions'),
  capture: name => ipcRenderer.invoke('capture', name),
});
