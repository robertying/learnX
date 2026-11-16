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

/** An item of a native menu (electron/menus.cjs). */
export interface BridgeMenuItem {
  id?: string;
  label?: string;
  type?: 'normal' | 'checkbox' | 'radio' | 'separator';
  checked?: boolean;
  enabled?: boolean;
  /** A count or detail after the label. */
  sublabel?: string;
}

/** What a file operation answers (electron/files.cjs). */
export type FileResult<T> = { result: T } | { error: string };

/** The file operations the main process runs synchronously. */
export interface FileOps {
  roots: () => { cache: string; document: string };
  info: (uri: string) => {
    exists: boolean;
    isDirectory: boolean;
    size: number;
  };
  list: (uri: string) => { name: string; isDirectory: boolean }[];
  makeDirectory: (
    uri: string,
    options?: { intermediates?: boolean; idempotent?: boolean },
  ) => void;
  remove: (uri: string) => void;
  move: (from: string, to: string, overwrite?: boolean) => void;
  copy: (from: string, to: string, overwrite?: boolean) => void;
  write: (uri: string, content: string | Uint8Array) => void;
  read: (uri: string, as: 'utf8' | 'bytes') => string | Uint8Array;
}

/** A load a web view asks the page about (electron/webviews.cjs). */
export interface WebviewLoadRequest {
  guestId: number;
  requestId: number;
  url: string;
  method: string;
  isTopFrame: boolean;
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
  /**
   * Shows a native menu at `position` (the page's coordinates) or the
   * pointer; resolves with the chosen item's id, or null.
   */
  menu: (
    items: BridgeMenuItem[],
    position?: { x: number; y: number },
  ) => Promise<string | null>;
  secrets: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<void>;
    remove: (key: string) => Promise<void>;
  };
  files: {
    sync: <Op extends keyof FileOps>(
      op: Op,
      ...args: Parameters<FileOps[Op]>
    ) => FileResult<ReturnType<FileOps[Op]>>;
    /** Downloads into a file with the session's cookies. */
    download: (
      id: number,
      req: { url: string; uri: string; headers?: Record<string, string> },
    ) => Promise<{ status: number }>;
    abortDownload: (id: number) => void;
    onProgress: (
      listener: (id: number, written: number, total: number) => void,
    ) => void;
  };
  webviews: {
    /** Sets the scripts a web view injects; false if it isn't the page's. */
    configure: (
      guestId: number,
      scripts: { before?: string; after?: string },
    ) => Promise<boolean>;
    onAsk: (listener: (request: WebviewLoadRequest) => void) => void;
    answer: (requestId: number, allow: boolean) => void;
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
