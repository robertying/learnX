/** A cookie as Electron's session gives it (the fields the app reads). */
export interface BridgeCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  /** Seconds since the epoch; none for a session cookie. */
  expirationDate?: number;
}

/** A cookie to set, as Electron's `cookies.set` takes it. */
export interface BridgeCookieDetails extends Partial<BridgeCookie> {
  url: string;
}

/** A request the main process sends for the page (electron/net.cjs). */
export interface BridgeRequest {
  url: string;
  method: string;
  headers: [string, string][];
  body?: ArrayBuffer;
}

export interface BridgeResponse {
  /** The final URL, after redirects. */
  url: string;
  status: number;
  statusText: string;
  redirected: boolean;
  headers: [string, string][];
  body: ArrayBuffer;
}

/**
 * What the Electron app's main process offers the page, as `window.learnx`
 * (electron/preload.cjs).
 */
export interface Bridge {
  platform: string;
  fetch: (id: number, req: BridgeRequest) => Promise<BridgeResponse>;
  abortFetch: (id: number) => void;
  cookies: {
    get: (url: string) => Promise<BridgeCookie[]>;
    set: (details: BridgeCookieDetails) => Promise<void>;
    remove: (url: string, name: string) => Promise<void>;
    flush: () => Promise<void>;
    clearAll: () => Promise<void>;
  };
  storage: {
    /** Every key and value in a database, read synchronously. */
    load: (db: string) => Record<string, string>;
    set: (db: string, key: string, value: string) => void;
    remove: (db: string, key: string) => void;
    clear: (db: string) => void;
  };
  secrets: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<void>;
    remove: (key: string) => Promise<void>;
  };
  /** A test run's launch options in development; empty elsewhere. */
  launchOptions: () => Record<string, unknown>;
  /** Saves a window capture in development; null elsewhere. */
  capture: (name: string) => Promise<string | null>;
}

/** The main process's services; throws outside the Electron app. */
export const bridge = (): Bridge => {
  const found = (globalThis as { learnx?: Bridge }).learnx;
  if (!found) {
    throw new Error('Not running in the learnX Electron app');
  }
  return found;
};
