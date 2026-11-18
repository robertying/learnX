// Requests the app sends to Tsinghua's servers, run in the main process: the
// renderer's own fetch would be blocked by the browser's cross-origin rules,
// and here every request shares the window session's cookies, as the web
// views do on the phone.

/**
 * The only sites the app talks to: Tsinghua's (Web Learning, the SSO login,
 * the registrar, the mirror the updater reads) and courseX (tsinghua.app).
 */
export const allowedHost = (host: string): boolean =>
  host === 'tsinghua.edu.cn' ||
  host.endsWith('.tsinghua.edu.cn') ||
  host === 'tsinghua.app';

/** Whether the main process may fetch `url`: http(s) to an allowed host. */
export const allowedUrl = (url: string): boolean => {
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

export type FetchRequest = {
  url: string;
  method: string;
  headers: [string, string][];
  body?: ArrayBuffer;
};

export type FetchResponse = {
  /** The final URL, after redirects. */
  url: string;
  status: number;
  statusText: string;
  redirected: boolean;
  headers: [string, string][];
  body: ArrayBuffer;
};

/**
 * How long a request may go without hearing from the server before it fails,
 * so a stalled connection doesn't hold a request (and the sync behind it)
 * forever: until the response starts, and between its pieces. One that
 * uploads (a submission's attachment) gets longer to send its body first.
 */
export const TIMEOUT_MS = { idle: 60_000, upload: 5 * 60_000 };

/**
 * Sends a request with `net.request`, following redirects itself to record
 * the final URL: Electron's `net.fetch` leaves `Response.url` empty and can't
 * take `redirect: 'manual'`, and thu-learn-lib reads the final URL (an expired
 * session ends on login_timeout). A redirect off the allowed sites is refused.
 */
export const mainFetch = (
  net: Pick<typeof Electron.net, 'request'>,
  session: Electron.Session,
  req: FetchRequest,
  signal?: AbortSignal,
  timeoutMs: { idle: number; upload: number } = TIMEOUT_MS,
): Promise<FetchResponse> =>
  new Promise((resolve, reject) => {
    if (!allowedUrl(req.url)) {
      reject(new Error(`Not an allowed URL: ${req.url}`));
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onAbort = () => fail(new Error('Aborted'));
    /** Ends the request and its timer and listener, once. */
    let settled = false;
    const settle = () => {
      if (settled) {
        return false;
      }
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      return true;
    };
    const fail = (error: Error) => {
      if (settle()) {
        request.abort();
        reject(error);
      }
    };
    const wait = (ms: number) => {
      clearTimeout(timer);
      timer = setTimeout(
        () => fail(new Error(`Timed out: no answer from ${new URL(url).host}`)),
        ms,
      );
    };
    let url = req.url;
    let redirected = false;
    const request = net.request({
      url: req.url,
      method: req.method,
      session,
      credentials: 'include',
      redirect: 'manual',
    });
    signal?.addEventListener('abort', onAbort, { once: true });
    for (const [name, value] of req.headers) {
      request.setHeader(name, value);
    }
    request.on('redirect', (_status, _method, redirectUrl) => {
      if (!allowedUrl(redirectUrl)) {
        fail(new Error(`Redirected off the allowed sites: ${redirectUrl}`));
        return;
      }
      url = redirectUrl;
      redirected = true;
      wait(timeoutMs.idle);
      request.followRedirect();
    });
    request.on('response', response => {
      const chunks: Buffer[] = [];
      wait(timeoutMs.idle);
      response.on('data', chunk => {
        chunks.push(chunk);
        wait(timeoutMs.idle);
      });
      response.on('error', fail);
      response.on('end', () => {
        if (!settle()) {
          return;
        }
        const body = Buffer.concat(chunks);
        const headers: [string, string][] = [];
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
    request.on('error', fail);
    if (req.body) {
      request.write(Buffer.from(req.body));
    }
    wait(req.body ? timeoutMs.upload : timeoutMs.idle);
    request.end();
  });
