// The bridge between the Electron app's page and its main process, as the
// page sees it (`window.learnx`): types only, so the preload
// (electron/preload.cts) checks what it exposes against the same ones.
/**
 * The system's dialog before a file that would run a program opens
 * (electron/fileShell.ts); `{name}` in `message` is the file's name.
 */
export interface BridgeRunLabels {
  message: string;
  detail: string;
  open: string;
  cancel: string;
}

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

/** A request the main process sends for the page (electron/net.ts). */
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

/** An item of a native menu (electron/menus.ts). */
export interface BridgeMenuItem {
  id?: string;
  label?: string;
  type?: 'normal' | 'checkbox' | 'radio' | 'separator';
  checked?: boolean;
  enabled?: boolean;
  /** A count or detail after the label. */
  sublabel?: string;
}

/** What a file operation answers (electron/files.ts). */
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

/** A load a web view asks the page about (electron/webviews.ts). */
export interface WebviewLoadRequest {
  guestId: number;
  requestId: number;
  url: string;
  method: string;
  isTopFrame: boolean;
}

/** An update of the Electron app, downloaded and waiting for a restart. */
export interface BridgeUpdate {
  version: string;
  /**
   * Where to download it, for a build that doesn't install updates itself
   * (a .deb): Settings links to it instead of restarting.
   */
  download?: string;
}

/** A notification for the main process to show (electron/notifications.ts). */
export interface BridgeNotificationRequest {
  identifier: string;
  content: {
    title?: string;
    subtitle?: string;
    body?: string;
    data?: Record<string, unknown>;
    categoryIdentifier?: string;
    threadIdentifier?: string;
  };
  /** Right away (null), at a date (ms), or after some seconds. */
  trigger: null | {
    type?: string;
    date?: number | string;
    seconds?: number;
    channelId?: string;
  };
}

/** A notification still waiting for its time. */
export interface BridgeScheduledNotification {
  identifier: string;
  content: BridgeNotificationRequest['content'];
  trigger: { type: 'date'; value: number };
}

/** A file the user picked, copied into the app's cache. */
export interface BridgePickedFile {
  uri: string;
  name: string;
  size: number;
  mimeType: string | null;
}

/** The labels of the tray's menu and the Jump List, in the app's language. */
export interface TrayLabels {
  open: string;
  /** Runs the background sync now. */
  checkForNewItems: string;
  quit: string;
  today: string;
  schedule: string;
  /** The export folder picker's title. */
  exportFolder: string;
}

/** A screen a Jump List task opens. */
export type LaunchTarget = 'today' | 'schedule';

/**
 * The app's language: the system's, or one chosen (electron/language.ts,
 * `APP_LANGUAGES`).
 */
export type AppLanguage = 'system' | 'zh-CN' | 'en-US';

/**
 * What the Electron app's main process offers the page, as `window.learnx`
 * (electron/preload.cts).
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
    /** Adds bytes to the end of a file, creating it. */
    append: (uri: string, content: Uint8Array) => Promise<void>;
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
    /**
     * Shows HTML too large for a data URL at its base URL; false when it
     * can't.
     */
    loadHtml: (
      guestId: number,
      html: string,
      baseUrl: string,
    ) => Promise<boolean>;
  };
  /** The app's version and its build number (electron/buildInfo.ts). */
  appInfo: () => { version: string; build: string; unsandboxed?: boolean };
  /** Quits and starts learnX again. */
  relaunch: () => void;
  /**
   * The app's own language setting, on Windows and Linux (`supported`):
   * the system's or one chosen, which takes effect at the next launch.
   */
  language: {
    get: () => Promise<{ supported: boolean; language: AppLanguage }>;
    /** Resolves to whether it was saved. */
    set: (language: AppLanguage) => Promise<boolean>;
  };
  /** Updates of the packaged app (electron/updater.ts). */
  updates: {
    /** Whether this run takes updates: a packaged Windows or Linux build. */
    checks: () => boolean;
    /** The update downloaded and waiting for a restart, or null. */
    pending: () => BridgeUpdate | null;
    /** Called when an update has downloaded. */
    onReady: (listener: (update: BridgeUpdate) => void) => void;
    /** Quits, installs the waiting update and opens the app again. */
    install: () => void;
  };
  /** Files outside the app's folders, through dialogs and the system. */
  shell: {
    /**
     * Opens a file in its default app, after a system dialog with `labels`
     * for one that would run a program; resolves to an error message or ''.
     */
    open: (uri: string, labels?: BridgeRunLabels) => Promise<string>;
    showInFolder: (uri: string) => Promise<void>;
    /** Saves a copy where the user picks; the path, or null if cancelled. */
    saveAs: (uri: string, name: string) => Promise<string | null>;
    /** Saves text where the user picks; the path, or null if cancelled. */
    saveText: (name: string, content: string) => Promise<string | null>;
    /** A folder the user picked, which the page may then write in. */
    pickDirectory: () => Promise<string | null>;
    pickFiles: (options?: {
      images?: boolean;
      multiple?: boolean;
    }) => Promise<BridgePickedFile[] | null>;
  };
  notifications: {
    supported: () => Promise<boolean>;
    schedule: (request: BridgeNotificationRequest) => Promise<string>;
    cancel: (identifier: string) => Promise<void>;
    list: () => Promise<BridgeScheduledNotification[]>;
    /** A notification the user clicked. */
    onResponse: (
      listener: (request: BridgeNotificationRequest) => void,
    ) => void;
    /** Development: a notification the main process only logged. */
    onDevShown: (
      listener: (shown: {
        title: string;
        subtitle?: string;
        body: string;
      }) => void,
    ) => void;
  };
  background: {
    /** Runs the background sync every `minutes` while the app is open. */
    start: (minutes: number) => Promise<void>;
    onRun: (listener: (options: { manual: boolean }) => void) => void;
  };
  loginItem: {
    get: () => Promise<{ supported: boolean; enabled: boolean }>;
    /** Resolves to whether it was changed. */
    set: (enabled: boolean) => Promise<boolean>;
  };
  system: {
    setLabels: (labels: TrayLabels) => Promise<void>;
    /** The screen the launch asked for, once. */
    takeOpen: () => Promise<LaunchTarget | null>;
    onOpen: (listener: (target: LaunchTarget) => void) => void;
  };
  /** A test run's launch options in development; empty elsewhere. */
  launchOptions: () => Record<string, unknown>;
  /** Saves a window capture in development; null elsewhere. */
  capture: (name: string) => Promise<string | null>;
}
