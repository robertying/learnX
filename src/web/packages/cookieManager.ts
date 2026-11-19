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
 * on the window session's cookies (one store, as on Android): what the app
 * calls there (data/source, helpers/webViewCookies). The iOS store options
 * have no meaning there and are ignored.
 */
const CookieManager = {
  get: async (url: string) =>
    Object.fromEntries(
      (await bridge().cookies.get(url)).map(c => [c.name, toCookie(c)]),
    ),
  set: (url: string, cookie: Cookie) => set(url, cookie),
  clearByName: async (url: string, name: string) => {
    await bridge().cookies.remove(url, name);
    return true;
  },
  clearAllStores: async () => {
    await bridge().cookies.clearAll();
    return true;
  },
};

export default CookieManager;
