import { bridge } from 'web/bridge';

let nextId = 1;

const abortError = () => new DOMException('Aborted', 'AbortError');

/**
 * `fetch` for http(s) URLs in the Electron app: each request runs in the main
 * process (electron/net.cjs), where the browser's cross-origin rules don't
 * apply and the cookies stay in the window's session. thu-learn-lib reads
 * `url` and `redirected`, which the response carries from there.
 */
export const electronFetch = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> => {
  // A Request turns a FormData or URLSearchParams body into bytes, with its
  // content type (a multipart boundary).
  const request = new Request(input, init);
  // A standalone Headers keeps what a Request's guard would drop (Cookie).
  const headers = new Headers(
    init.headers ?? (input instanceof Request ? input.headers : undefined),
  );
  const contentType = request.headers.get('content-type');
  if (contentType && !headers.has('content-type')) {
    headers.set('content-type', contentType);
  }
  const body =
    request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : await request.arrayBuffer();

  const signal = init.signal ?? undefined;
  if (signal?.aborted) {
    throw abortError();
  }
  const id = nextId++;
  const pending = bridge()
    .fetch(id, {
      url: request.url,
      method: request.method,
      headers: [...headers],
      body,
    })
    .catch((error: unknown) => {
      console.warn(`Request to ${request.url} failed: ${String(error)}`);
      // What a browser's fetch rejects with when the network fails.
      throw new TypeError('Network request failed');
    });
  const res = await (signal
    ? Promise.race([
        pending,
        new Promise<never>((_, reject) =>
          signal.addEventListener(
            'abort',
            () => {
              bridge().abortFetch(id);
              reject(abortError());
            },
            { once: true },
          ),
        ),
      ])
    : pending);

  const nullBody = [101, 204, 205, 304].includes(res.status);
  const response = new Response(nullBody ? null : res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
  Object.defineProperty(response, 'url', { value: res.url });
  Object.defineProperty(response, 'redirected', { value: res.redirected });
  return response;
};

const requestUrl = (input: RequestInfo | URL) =>
  typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.href
      : input.url;

/**
 * Sends the page's http(s) requests through the main process and leaves the
 * rest (the app's own files, data: and blob: URLs) to the browser.
 */
export const installElectronFetch = () => {
  const browserFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input, init) =>
    /^https?:/i.test(requestUrl(input))
      ? electronFetch(input, init)
      : browserFetch(input, init);
};
