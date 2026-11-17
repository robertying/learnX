import { bridge, type BridgeCookie } from 'web/bridge';

/** A cookie as @preeternal/react-native-cookie-manager gives it. */
export interface Cookie {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  /** ISO 8601. */
  expires?: string;
  secure?: boolean;
  httpOnly?: boolean;
}

const toCookie = (c: BridgeCookie): Cookie => ({
  name: c.name,
  value: c.value,
  path: c.path,
  domain: c.domain,
  expires:
    c.expirationDate === undefined
      ? undefined
      : new Date(c.expirationDate * 1000).toISOString(),
  secure: c.secure,
  httpOnly: c.httpOnly,
});

/**
 * Reads a `Set-Cookie` header's name, value and the attributes the app sets
 * (path, domain, Secure, HttpOnly, Expires, Max-Age).
 */
export const parseSetCookie = (header: string): Cookie => {
  const [pair = '', ...attributes] = header.split(';');
  const separator = pair.indexOf('=');
  const cookie: Cookie = {
    name: (separator < 0 ? pair : pair.slice(0, separator)).trim(),
    value: separator < 0 ? '' : pair.slice(separator + 1).trim(),
  };
  for (const attribute of attributes) {
    const [rawKey = '', ...rest] = attribute.split('=');
    const key = rawKey.trim().toLowerCase();
    const value = rest.join('=').trim();
    if (key === 'path') {
      cookie.path = value;
    } else if (key === 'domain') {
      cookie.domain = value;
    } else if (key === 'secure') {
      cookie.secure = true;
    } else if (key === 'httponly') {
      cookie.httpOnly = true;
    } else if (key === 'expires') {
      cookie.expires = new Date(value).toISOString();
    } else if (key === 'max-age') {
      cookie.expires = new Date(
        Date.now() + Number(value) * 1000,
      ).toISOString();
    }
  }
  return cookie;
};

const set = async (url: string, cookie: Cookie) => {
  await bridge().cookies.set({
    url,
    name: cookie.name,
    value: cookie.value,
    path: cookie.path,
    domain: cookie.domain,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    expirationDate:
      cookie.expires === undefined
        ? undefined
        : new Date(cookie.expires).getTime() / 1000,
  });
  return true;
};

/**
 * Stands in for @preeternal/react-native-cookie-manager in the Electron app,
 * on the window session's cookies (one store, as on Android). The iOS store
 * options have no meaning there and are ignored.
 */
const CookieManager = {
  get: async (url: string) =>
    Object.fromEntries(
      (await bridge().cookies.get(url)).map(c => [c.name, toCookie(c)]),
    ),
  set: (url: string, cookie: Cookie) => set(url, cookie),
  setFromResponse: (url: string, header: string) =>
    set(url, parseSetCookie(header)),
  clearByName: async (url: string, name: string) => {
    await bridge().cookies.remove(url, name);
    return true;
  },
  flush: () => bridge().cookies.flush(),
  clearAll: async () => {
    await bridge().cookies.clearAll();
    return true;
  },
  clearAllStores: async () => {
    await bridge().cookies.clearAll();
    return true;
  },
};

export default CookieManager;
