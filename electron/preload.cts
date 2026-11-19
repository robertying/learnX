// What the app's web build may ask of the main process (main.ts), as
// `window.learnx`: the page runs sandboxed and context-isolated, without Node.
// CommonJS, as a sandboxed preload must be, and run without its types
// (preloads.ts strips them): the page's own declaration of the bridge
// (src/web/bridgeTypes.ts) types it.
import type { Bridge } from '../src/web/bridgeTypes.ts';

const {
  contextBridge,
  ipcRenderer,
}: typeof import('electron') = require('electron');

const learnx: Bridge = {
  platform: process.platform,
  fetch: (id, req) => ipcRenderer.invoke('fetch', id, req),
  abortFetch: id => ipcRenderer.send('fetch:abort', id),
  cookies: {
    get: url => ipcRenderer.invoke('cookies:get', url),
    set: details => ipcRenderer.invoke('cookies:set', details),
    remove: (url, name) => ipcRenderer.invoke('cookies:remove', url, name),
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
    append: (uri, content) => ipcRenderer.invoke('files:append', uri, content),
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
    loadHtml: (guestId, html, baseUrl) =>
      ipcRenderer.invoke('webview:loadHtml', guestId, html, baseUrl),
  },
  // The app's version and build number, and the update waiting for a
  // restart (updater.ts): null until one has downloaded.
  appInfo: () => ipcRenderer.sendSync('app:info'),
  relaunch: () => ipcRenderer.send('app:relaunch'),
  // The app's own language, where it has one (language.ts).
  language: {
    get: () => ipcRenderer.invoke('language:get'),
    set: language => ipcRenderer.invoke('language:set', language),
  },
  updates: {
    checks: () => ipcRenderer.sendSync('updates:checks'),
    pending: () => ipcRenderer.sendSync('updates:pending'),
    onReady: listener => {
      ipcRenderer.on('updates:ready', (_event, update) => listener(update));
    },
    install: () => ipcRenderer.send('updates:install'),
  },
  // Around the window (system.ts).
  shell: {
    open: (uri, labels) => ipcRenderer.invoke('shell:open', uri, labels),
    showInFolder: uri => ipcRenderer.invoke('shell:showInFolder', uri),
    saveAs: (uri, name) => ipcRenderer.invoke('shell:saveAs', uri, name),
    saveText: (name, content) =>
      ipcRenderer.invoke('shell:saveText', name, content),
    pickDirectory: () => ipcRenderer.invoke('shell:pickDirectory'),
    pickFiles: options => ipcRenderer.invoke('shell:pickFiles', options),
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
  system: {
    setLabels: labels => ipcRenderer.invoke('system:setLabels', labels),
    takeOpen: () => ipcRenderer.invoke('system:takeOpen'),
    onOpen: listener => {
      ipcRenderer.on('system:open', (_event, target) => listener(target));
    },
  },
  // Development only: the dev runner's launch options (empty otherwise), and
  // a window capture, which main.ts saves when the dev runner asks for them
  // and returns null otherwise.
  launchOptions: () => ipcRenderer.sendSync('launchOptions'),
  capture: name => ipcRenderer.invoke('capture', name),
};

contextBridge.exposeInMainWorld('learnx', learnx);
