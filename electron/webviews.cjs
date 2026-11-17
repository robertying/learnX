// The web views the page shows (`<webview>`, src/web/packages/WebView.tsx):
// the SSO login, notice and assignment bodies, courseX and the changelog.
// Each runs sandboxed and context-isolated on the window's session, so it
// shares the cookies the app's requests use, with only learnX's own preload
// (webviewPreload.cjs). The page decides which loads go ahead, as a React
// Native web view's `onShouldStartLoadWithRequest` does, and this process
// keeps every page on the sites below whatever it decides.
const { allowedHost } = require('./net.cjs');
const { readShared } = require('./shared.cjs');
/**
 * The session every web view shares with the app's requests (the page names
 * it too, from the same file).
 */
const { partition: PARTITION } = readShared('webviewPartition.json');

/** How long a load waits for the page to decide before it's refused. */
const DECISION_TIMEOUT_MS = 15_000;

/** How long an HTML load (`loadHtml`) may take before it's given up. */
const HTML_LOAD_TIMEOUT_MS = 30_000;

/**
 * Whether a web view may show `url`: Tsinghua's sites and courseX, as the
 * app's requests (net.cjs), and learnX's GitHub pages for the changelog.
 * @param {string} url
 */
const webviewAllowedUrl = url => {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return false;
  }
  return (
    allowedHost(parsed.hostname) ||
    (parsed.protocol === 'https:' &&
      parsed.hostname === 'github.com' &&
      /^\/robertying\/learnX(\/|$)/i.test(parsed.pathname))
  );
};

/**
 * What a web view's page may do without asking: show a video full screen and
 * write to the clipboard (a copy button), on the sites it may show. Nothing
 * else (camera, microphone, location, notifications…), and nothing for the
 * app's own window.
 * @param {Electron.WebContents | null} contents the page asking
 * @param {string} permission
 * @param {string} url the page's URL
 */
const webviewPermission = (contents, permission, url) =>
  !!contents &&
  !contents.isDestroyed() &&
  contents.getType() === 'webview' &&
  ['fullscreen', 'clipboard-sanitized-write'].includes(permission) &&
  webviewAllowedUrl(url);

/**
 * Links a web view may hand to the system's browser or mail app.
 * @param {string} url
 */
const externalUrl = url => /^(https?|mailto):/i.test(url);

/**
 * Hardens a `<webview>` before it attaches (`will-attach-webview`): it must
 * start blank on the window's session, and gets learnX's preload, the
 * sandbox and context isolation whatever its attributes asked for. A page
 * may only turn JavaScript off. Returns false to refuse the web view.
 *
 * @param {Electron.WebPreferences} webPreferences
 * @param {Record<string, string>} params
 * @param {string} preload
 * @param {{ backgroundThrottling?: boolean }} [options] as the window's
 */
const hardenWebview = (
  webPreferences,
  params,
  preload,
  { backgroundThrottling = true } = {},
) => {
  if (params.partition !== PARTITION || params.src !== 'about:blank') {
    return false;
  }
  const javascript = webPreferences.javascript !== false;
  for (const key of Object.keys(webPreferences)) {
    delete webPreferences[/** @type {keyof Electron.WebPreferences} */ (key)];
  }
  Object.assign(webPreferences, {
    // Electron reads the session from here, not from the attribute.
    partition: PARTITION,
    preload,
    sandbox: true,
    contextIsolation: true,
    nodeIntegration: false,
    nodeIntegrationInSubFrames: false,
    webSecurity: true,
    javascript,
    spellcheck: false,
    backgroundThrottling,
  });
  delete params.allowpopups;
  delete params.preload;
  return true;
};

/**
 * @typedef {object} LoadRequest
 * @property {number} guestId the web view's web contents
 * @property {number} requestId
 * @property {string} url
 * @property {string} method
 * @property {boolean} isTopFrame
 *
 * @typedef {object} Scripts
 * @property {string} [before] runs before the page's own scripts
 * @property {string} [after] runs once the document has loaded
 */

/**
 * The web views' state in the main process: the scripts each one injects,
 * and the loads waiting for the page to decide on them.
 *
 * @param {object} options
 * @param {(url: string) => void} options.openExternal
 * @param {number} [options.timeoutMs]
 */
const createWebviews = ({ openExternal, timeoutMs = DECISION_TIMEOUT_MS }) => {
  /** @type {Map<number, Scripts>} */
  const scripts = new Map();
  /**
   * @type {Map<number, {host: Electron.WebContents, resolve: (allow: boolean) => void}>}
   */
  const pending = new Map();
  let nextRequestId = 1;
  /**
   * Loads `loadHtml` started, by web view and URL: the app's own, so they
   * aren't asked about.
   * @type {Set<string>}
   */
  const htmlLoads = new Set();
  /**
   * The HTML load under way in each web view, by its id, ended (and its
   * debugger detached) when another starts there: the newer one wins.
   * @type {Map<number, () => void>}
   */
  const htmlLoadsByGuest = new Map();

  /**
   * Whether `guest` is a web view that `host` shows.
   * @param {Electron.WebContents | undefined | null} guest
   * @param {Electron.WebContents} host
   */
  const isGuestOf = (guest, host) =>
    !!guest &&
    !guest.isDestroyed() &&
    guest.getType() === 'webview' &&
    guest.hostWebContents === host;

  /**
   * Asks the page whether `guest` may load `url`, and waits for its answer.
   * @param {Electron.WebContents} guest
   * @param {Omit<LoadRequest, 'guestId' | 'requestId'>} request
   * @returns {Promise<boolean>}
   */
  const ask = (guest, request) =>
    new Promise(resolve => {
      const host = guest.hostWebContents;
      if (!host || host.isDestroyed()) {
        resolve(false);
        return;
      }
      const requestId = nextRequestId++;
      const timer = setTimeout(() => settle(false), timeoutMs);
      const settle = (/** @type {boolean} */ allow) => {
        clearTimeout(timer);
        pending.delete(requestId);
        resolve(allow);
      };
      pending.set(requestId, { host, resolve: settle });
      /** @type {LoadRequest} */
      const message = { ...request, guestId: guest.id, requestId };
      host.send('webview:ask', message);
    });

  return {
    /**
     * Stores the scripts a web view injects from its next load on, for the
     * host page that shows it; false when it isn't that page's web view.
     * @param {Electron.WebContents} host
     * @param {Electron.WebContents | undefined} guest
     * @param {Scripts} given
     */
    configure: (host, guest, given) => {
      if (!guest || !isGuestOf(guest, host)) {
        return false;
      }
      if (!scripts.has(guest.id)) {
        guest.once('destroyed', () => scripts.delete(guest.id));
      }
      scripts.set(guest.id, {
        before: typeof given?.before === 'string' ? given.before : undefined,
        after: typeof given?.after === 'string' ? given.after : undefined,
      });
      return true;
    },

    /**
     * The scripts for a web view's preload to inject.
     * @param {Electron.WebContents} guest
     * @returns {Scripts}
     */
    scriptsFor: guest =>
      guest.getType() === 'webview' ? (scripts.get(guest.id) ?? {}) : {},

    /**
     * Shows HTML in a web view at its base URL, as the phones'
     * `loadHTMLString` does, for HTML too large for a data URL (Chromium
     * refuses URLs over 2 MB): the web view loads the base URL, and its
     * document request is answered with the HTML through that web view's own
     * DevTools protocol (`Fetch`), so nothing else's requests are touched and
     * the page has the base URL's origin. Resolves to false when it can't
     * (not the page's web view, a base URL off the allowed sites, or a
     * debugger already attached).
     *
     * @param {Electron.WebContents} host
     * @param {Electron.WebContents | undefined} guest
     * @param {string} html
     * @param {string} baseUrl
     * @returns {Promise<boolean>}
     */
    loadHtml: async (host, guest, html, baseUrl) => {
      if (
        !guest ||
        !isGuestOf(guest, host) ||
        typeof html !== 'string' ||
        !webviewAllowedUrl(baseUrl)
      ) {
        return false;
      }
      const url = new URL(baseUrl).href;
      const { debugger: devtools } = guest;
      htmlLoadsByGuest.get(guest.id)?.();
      try {
        devtools.attach('1.3');
      } catch {
        return false;
      }
      const key = `${guest.id} ${url}`;
      let finished = false;
      const finish = () => {
        if (finished) {
          return;
        }
        finished = true;
        clearTimeout(timer);
        htmlLoads.delete(key);
        if (htmlLoadsByGuest.get(guest.id) === finish) {
          htmlLoadsByGuest.delete(guest.id);
        }
        devtools.removeListener('message', onMessage);
        if (devtools.isAttached()) {
          devtools.detach();
        }
      };
      htmlLoadsByGuest.set(guest.id, finish);
      const timer = setTimeout(finish, HTML_LOAD_TIMEOUT_MS);
      /**
       * @param {unknown} _event
       * @param {string} method
       * @param {{ requestId: string; request: { url: string; method: string }; resourceType: string }} params
       */
      const onMessage = (_event, method, params) => {
        if (method !== 'Fetch.requestPaused') {
          return;
        }
        const ours =
          params.resourceType === 'Document' &&
          params.request.method === 'GET' &&
          params.request.url === url;
        void (
          ours
            ? devtools.sendCommand('Fetch.fulfillRequest', {
                requestId: params.requestId,
                responseCode: 200,
                responseHeaders: [
                  { name: 'Content-Type', value: 'text/html; charset=utf-8' },
                ],
                body: Buffer.from(html, 'utf8').toString('base64'),
              })
            : devtools.sendCommand('Fetch.continueRequest', {
                requestId: params.requestId,
              })
        )
          .catch(() => {})
          .finally(() => {
            if (ours) {
              finish();
            }
          });
      };
      devtools.on('message', onMessage);
      guest.once('destroyed', finish);
      try {
        await devtools.sendCommand('Fetch.enable', {
          patterns: [
            {
              urlPattern: '*',
              resourceType: 'Document',
              requestStage: 'Request',
            },
          ],
        });
      } catch {
        finish();
        return false;
      }
      htmlLoads.add(key);
      guest.loadURL(url).catch(() => {});
      return true;
    },

    /**
     * The page's answer to a load it was asked about; ignored unless it
     * comes from the page that was asked.
     * @param {Electron.WebContents} host
     * @param {number} requestId
     * @param {boolean} allow
     */
    answer: (host, requestId, allow) => {
      const entry = pending.get(requestId);
      if (entry && entry.host === host) {
        entry.resolve(allow === true);
      }
    },

    /**
     * Decides on a web view's top-level load (`webRequest.onBeforeRequest`
     * for main frames, so a form's POST goes ahead as it was sent): the page
     * decides, and a load it allows off the allowed sites opens in the
     * system's browser instead. Anything else passes.
     *
     * @param {Electron.OnBeforeRequestListenerDetails} details
     * @param {(response: Electron.CallbackResponse) => void} callback
     */
    onBeforeRequest: (details, callback) => {
      const guest = details.webContents;
      if (
        details.resourceType !== 'mainFrame' ||
        !guest ||
        guest.isDestroyed() ||
        guest.getType() !== 'webview'
      ) {
        callback({});
        return;
      }
      // HTML the app is showing (loadHtml): already its own decision.
      if (htmlLoads.has(`${guest.id} ${details.url}`)) {
        callback({});
        return;
      }
      void ask(guest, {
        url: details.url,
        method: details.method,
        isTopFrame: true,
      }).then(allow => {
        if (allow && webviewAllowedUrl(details.url)) {
          callback({});
          return;
        }
        if (allow && details.method === 'GET' && externalUrl(details.url)) {
          openExternal(details.url);
        }
        callback({ cancel: true });
      });
    },

    /**
     * Keeps a newly attached web view's pages to themselves: new windows open
     * in the system's browser, and it never leaves the web for another
     * scheme (the app's own pages, files).
     * @param {Electron.WebContents} guest
     */
    guard: guest => {
      guest.setWindowOpenHandler(({ url }) => {
        if (externalUrl(url)) {
          openExternal(url);
        }
        return { action: 'deny' };
      });
      guest.on('will-navigate', (event, url) => {
        if (/^mailto:/i.test(url)) {
          event.preventDefault();
          openExternal(url);
        } else if (!/^(https?|about):/i.test(url)) {
          event.preventDefault();
        }
      });
    },
  };
};

module.exports = {
  HTML_LOAD_TIMEOUT_MS,
  PARTITION,
  createWebviews,
  externalUrl,
  hardenWebview,
  webviewAllowedUrl,
  webviewPermission,
};
