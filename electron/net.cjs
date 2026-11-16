// Requests the app sends to Tsinghua's servers, run in the main process: the
// renderer's own fetch would be blocked by the browser's cross-origin rules,
// and here every request shares the window session's cookies, as the web
// views do on the phone.

/**
 * The only sites the app talks to: Tsinghua's (Web Learning, the SSO login,
 * the registrar, the mirror the updater reads) and courseX (tsinghua.app).
 * @param {string} host
 */
const allowedHost = host =>
  host === 'tsinghua.edu.cn' ||
  host.endsWith('.tsinghua.edu.cn') ||
  host === 'tsinghua.app';

/**
 * Whether the main process may fetch `url`: http(s) to an allowed host.
 * @param {string} url
 */
const allowedUrl = url => {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return (
    (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
    allowedHost(parsed.hostname)
  );
};

/**
 * @typedef {object} FetchRequest
 * @property {string} url
 * @property {string} method
 * @property {[string, string][]} headers
 * @property {ArrayBuffer} [body]
 *
 * @typedef {object} FetchResponse
 * @property {string} url the final URL, after redirects
 * @property {number} status
 * @property {string} statusText
 * @property {boolean} redirected
 * @property {[string, string][]} headers
 * @property {ArrayBuffer} body
 */

/**
 * Sends a request with `net.request`, following redirects itself to record
 * the final URL: Electron's `net.fetch` leaves `Response.url` empty and can't
 * take `redirect: 'manual'`, and thu-learn-lib reads the final URL (an expired
 * session ends on login_timeout). A redirect off the allowed sites is refused.
 *
 * @param {Pick<typeof import('electron').net, 'request'>} net
 * @param {import('electron').Session} session
 * @param {FetchRequest} req
 * @param {AbortSignal} [signal]
 * @returns {Promise<FetchResponse>}
 */
const mainFetch = (net, session, req, signal) =>
  new Promise((resolve, reject) => {
    if (!allowedUrl(req.url)) {
      reject(new Error(`Not an allowed URL: ${req.url}`));
      return;
    }
    let url = req.url;
    let redirected = false;
    const request = net.request({
      url: req.url,
      method: req.method,
      session,
      credentials: 'include',
      redirect: 'manual',
    });
    signal?.addEventListener('abort', () => {
      request.abort();
      reject(new Error('Aborted'));
    });
    for (const [name, value] of req.headers) {
      request.setHeader(name, value);
    }
    request.on('redirect', (_status, _method, redirectUrl) => {
      if (!allowedUrl(redirectUrl)) {
        request.abort();
        reject(new Error(`Redirected off the allowed sites: ${redirectUrl}`));
        return;
      }
      url = redirectUrl;
      redirected = true;
      request.followRedirect();
    });
    request.on('response', response => {
      /** @type {Buffer[]} */
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('error', reject);
      response.on('end', () => {
        const body = Buffer.concat(chunks);
        /** @type {[string, string][]} */
        const headers = [];
        for (const [name, value] of Object.entries(response.headers)) {
          for (const v of [value].flat()) {
            headers.push([name, v]);
          }
        }
        resolve({
          url,
          status: response.statusCode,
          statusText: response.statusMessage,
          redirected,
          headers,
          body: body.buffer.slice(
            body.byteOffset,
            body.byteOffset + body.byteLength,
          ),
        });
      });
    });
    request.on('error', reject);
    if (req.body) {
      request.write(Buffer.from(req.body));
    }
    request.end();
  });

module.exports = { allowedHost, allowedUrl, mainFetch };
