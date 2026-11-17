// The app's own origin, app://learnx/: serving the web build there with its
// content security policy, and telling IPC from the app's page apart from
// anything else (a web view, a frame in it).
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ORIGIN = 'app://learnx';

// Scripts and styles only from the app itself (React Native Web sets styles
// inline), images from anywhere over https (course pictures, avatars).
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https: app://files",
  // The file preview (fileShell.cjs): downloads on an origin of their own.
  'frame-src app://files',
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
].join('; ');

/**
 * The file of the web build a path asks for: the file itself if it lies in
 * `webDir`, else index.html (the app routes in the page). A path that
 * escapes `webDir` (`..`, encoded or not, backslashes, another drive) gets
 * index.html too.
 * @param {string} webDir an absolute path
 * @param {string} pathname the URL's, percent-encoded
 */
const webFileOf = (webDir, pathname) => {
  let file;
  try {
    file = path.join(webDir, decodeURIComponent(pathname));
  } catch {
    file = '';
  }
  return file.startsWith(webDir + path.sep) &&
    fs.existsSync(file) &&
    fs.statSync(file).isFile()
    ? file
    : path.join(webDir, 'index.html');
};

/**
 * The `app:` protocol's handler: the web build at app://learnx/, with the
 * content security policy, and the file preview at app://files/.
 *
 * @param {{
 *   webDir: string;
 *   fetchFile: (url: string) => Promise<Response>;
 *   servePreview: () => ((request: Request) => Promise<Response>) | undefined;
 * }} options
 */
const createServeApp =
  ({ webDir, fetchFile, servePreview }) =>
  async (/** @type {Request} */ request) => {
    const { host, pathname } = new URL(request.url);
    if (host === 'files') {
      const preview = servePreview();
      return preview
        ? preview(request)
        : new Response('Not found', { status: 404 });
    }
    if (host !== 'learnx') {
      return new Response('Not found', { status: 404 });
    }
    const response = await fetchFile(
      pathToFileURL(webFileOf(webDir, pathname)).toString(),
    );
    const headers = new Headers(response.headers);
    headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);
    return new Response(response.body, { status: response.status, headers });
  };

/**
 * Only the app's own pages may call the main process: its window's main
 * frame on app://learnx/, never a web view it shows or a frame in it.
 * Throws for anything else.
 * @param {Electron.IpcMainEvent | Electron.IpcMainInvokeEvent} event
 */
const fromApp = event => {
  if (
    event.sender.getType() !== 'window' ||
    !event.senderFrame ||
    event.senderFrame.parent !== null ||
    !event.senderFrame.url.startsWith(`${ORIGIN}/`)
  ) {
    throw new Error('IPC from outside the app');
  }
};

module.exports = {
  CONTENT_SECURITY_POLICY,
  ORIGIN,
  createServeApp,
  fromApp,
  webFileOf,
};
