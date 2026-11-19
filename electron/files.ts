// learnX's own files (downloads, drafts, exports in the making) for the page,
// which has no file system: expo-file-system's stand-in
// (src/web/packages/fileSystem.ts) calls these over IPC. Every path must lie
// in one of the app's folders under its data folder, `cache` and `document`,
// as on the phone, or, for what an export does, in a folder the user picked
// for it (`grant`).
// Downloads run here with the window session's cookies.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TIMEOUT_MS, allowedUrl } from './net.ts';

/** Where the mock account's files come from (src/data/mock.ts). */
const MOCK_FILES =
  'https://raw.githubusercontent.com/robertying/learnX/main/mock-files/';

/**
 * Whether a download may come from `url`: Tsinghua's sites and courseX, as
 * every request, or the mock account's files. The path is read as the
 * request will send it, so `mock-files/../..` can't leave the folder.
 */
export const downloadAllowedUrl = (url: string): boolean => {
  if (allowedUrl(url)) {
    return true;
  }
  try {
    const { origin, pathname } = new URL(url);
    return `${origin}${pathname}`.startsWith(MOCK_FILES);
  } catch {
    return false;
  }
};

type EntryInfo = {
  exists: boolean;
  isDirectory: boolean;
  /** Bytes; a folder's is everything in it. */
  size: number;
};

const sizeOf = (dir: string): number => {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? sizeOf(full) : fs.statSync(full).size;
  }
  return total;
};

/**
 * Marks a finished download as one from the internet on Windows (the
 * `Zone.Identifier` stream a browser writes), so Windows, SmartScreen and
 * Office treat it as they would a browser's download: a warning before a
 * program runs, Protected View for a document. Nothing elsewhere, or where
 * the disk keeps no such streams.
 * @param url where it came from; only its origin is kept
 */
export const markDownloaded = (
  file: string,
  url: string,
  platform: string,
): void => {
  if (platform !== 'win32') {
    return;
  }
  try {
    fs.writeFileSync(
      `${file}:Zone.Identifier`,
      `[ZoneTransfer]\r\nZoneId=3\r\nHostUrl=${new URL(url).origin}/\r\n`,
    );
  } catch {
    // FAT32 and network drives have no alternate streams.
  }
};

/**
 * How long a folder picked for an export stays open to the page after its
 * last use: an export runs right after the folder is picked.
 */
export const GRANT_IDLE_MS = 10 * 60 * 1000;

/** @param roots absolute folder paths */
export const createFiles = (
  roots: { cache: string; document: string },
  {
    platform = process.platform,
    now = Date.now,
  }: { platform?: string; now?: () => number } = {},
) => {
  const rootPaths = Object.values(roots).map(root => path.resolve(root));
  for (const root of rootPaths) {
    fs.mkdirSync(root, { recursive: true });
  }
  /**
   * Folders the user picked in a folder dialog for an export, with when each
   * was last used. The page may only look in them, make folders and copy
   * its own files in (`exporting`), replacing a file of the same name, as
   * exporting again does: never read, move or delete what's there, and only
   * for a while.
   */
  const granted = new Map<string, number>();

  const isIn = (resolved: string, root: string) =>
    resolved === root || resolved.startsWith(root + path.sep);

  /** The granted folder `resolved` lies in, if one still is. */
  const grantOf = (resolved: string) => {
    for (const [root, used] of granted) {
      if (now() - used > GRANT_IDLE_MS) {
        granted.delete(root);
      } else if (isIn(resolved, root)) {
        granted.set(root, now());
        return root;
      }
    }
    return null;
  };

  /**
   * The path of a file URI inside the app's folders, or with `exporting`
   * inside a granted folder; throws for anything else.
   */
  const pathOf = (
    uri: unknown,
    { exporting = false }: { exporting?: boolean } = {},
  ) => {
    if (typeof uri !== 'string' || !uri.startsWith('file:')) {
      throw new Error('Not a file URI');
    }
    const resolved = path.resolve(fileURLToPath(uri));
    if (
      !rootPaths.some(root => isIn(resolved, root)) &&
      !(exporting && grantOf(resolved))
    ) {
      throw new Error('Outside the app folders');
    }
    return resolved;
  };

  /** A path that may be changed: inside a folder, never a folder itself. */
  const innerPathOf = (uri: unknown, options?: { exporting?: boolean }) => {
    const resolved = pathOf(uri, options);
    if (rootPaths.includes(resolved) || granted.has(resolved)) {
      throw new Error('The app folders themselves stay');
    }
    return resolved;
  };
  const exporting = { exporting: true };

  return {
    /**
     * Lets the page work in a folder the user picked (a dialog in the main
     * process, never the page's own choice), and returns its URI.
     * @param dir an absolute path
     */
    grant: (dir: string): string => {
      const resolved = path.resolve(dir);
      granted.set(resolved, now());
      return pathToFileURL(resolved + path.sep).href;
    },

    /**
     * The path of a file URI in the app's folders, for the main process's
     * own use (opening, saving and previewing a download); throws for
     * anything else.
     */
    localPath: (uri: string): string => pathOf(uri),

    /** The folders' URIs, ending in a slash. */
    roots: () => {
      const uriOf = (root: string) =>
        pathToFileURL(path.resolve(root) + path.sep).href;
      return { cache: uriOf(roots.cache), document: uriOf(roots.document) };
    },

    info: (uri: string): EntryInfo => {
      const target = pathOf(uri, exporting);
      let stat;
      try {
        stat = fs.statSync(target);
      } catch {
        return { exists: false, isDirectory: false, size: 0 };
      }
      return {
        exists: true,
        isDirectory: stat.isDirectory(),
        size: stat.isDirectory() ? sizeOf(target) : stat.size,
      };
    },

    list: (uri: string): { name: string; isDirectory: boolean }[] =>
      fs
        .readdirSync(pathOf(uri, exporting), { withFileTypes: true })
        .map(entry => ({ name: entry.name, isDirectory: entry.isDirectory() })),

    makeDirectory: (
      uri: string,
      {
        intermediates = false,
        idempotent = false,
      }: { intermediates?: boolean; idempotent?: boolean } = {},
    ): void => {
      const target = pathOf(uri, exporting);
      if (fs.existsSync(target)) {
        if (idempotent && fs.statSync(target).isDirectory()) {
          return;
        }
        throw new Error('Already exists');
      }
      fs.mkdirSync(target, { recursive: intermediates });
    },

    remove: (uri: string): void => {
      fs.rmSync(innerPathOf(uri), { recursive: true, force: true });
    },

    move: (from: string, to: string, overwrite = false): void => {
      const source = innerPathOf(from);
      const target = innerPathOf(to);
      if (!overwrite && fs.existsSync(target)) {
        throw new Error('Already exists');
      }
      fs.rmSync(target, { recursive: true, force: true });
      fs.renameSync(source, target);
    },

    copy: (from: string, to: string, overwrite = false): void => {
      fs.cpSync(pathOf(from), innerPathOf(to, exporting), {
        recursive: true,
        force: overwrite,
        errorOnExist: !overwrite,
      });
    },

    write: (uri: string, content: string | Uint8Array): void => {
      fs.writeFileSync(innerPathOf(uri), content);
    },

    /**
     * Adds bytes to the end of a file (creating it), so the page can copy a
     * large one in pieces without holding it whole (a dropped file).
     */
    append: (uri: string, content: Uint8Array): void => {
      if (!(content instanceof Uint8Array)) {
        throw new Error('Not bytes');
      }
      fs.appendFileSync(innerPathOf(uri), content);
    },

    read: (uri: string, as: 'utf8' | 'bytes'): string | Uint8Array => {
      const data = fs.readFileSync(pathOf(uri));
      return as === 'utf8' ? data.toString('utf8') : new Uint8Array(data);
    },

    /**
     * Downloads `url` into `uri` with the session's cookies, following
     * redirects on the allowed sites (`downloadAllowedUrl`). Rejects on a status other than 2xx as
     * expo-file-system does ("Unable to download a file: server returned
     * HTTP 403"), leaving no file behind.
     *
     * A download that hears nothing from the server for a minute (before the
     * response or between its pieces) fails, as a request does (net.ts).
     */
    download: (
      net: Pick<typeof Electron.net, 'request'>,
      session: Electron.Session,
      req: { url: string; uri: string; headers?: Record<string, string> },
      {
        signal,
        onProgress,
        idleMs = TIMEOUT_MS.idle,
      }: {
        signal?: AbortSignal;
        onProgress?: (written: number, total: number) => void;
        idleMs?: number;
      } = {},
    ): Promise<{ status: number }> =>
      new Promise((resolve, reject) => {
        const target = innerPathOf(req.uri);
        if (!downloadAllowedUrl(req.url)) {
          reject(new Error(`Not an allowed URL: ${req.url}`));
          return;
        }
        const request = net.request({
          url: req.url,
          session,
          credentials: 'include',
          redirect: 'manual',
        });
        let out: fs.WriteStream | undefined;
        let done = false;
        let finalUrl = req.url;
        const onAbort = () => fail(new Error('Aborted'));
        let timer: ReturnType<typeof setTimeout> | undefined;
        const wait = () => {
          clearTimeout(timer);
          timer = setTimeout(
            () =>
              fail(
                new Error(
                  `Timed out: no answer from ${new URL(finalUrl).host}`,
                ),
              ),
            idleMs,
          );
        };
        const fail = (error: Error) => {
          if (done) {
            return;
          }
          done = true;
          clearTimeout(timer);
          signal?.removeEventListener('abort', onAbort);
          request.abort();
          out?.destroy();
          fs.rmSync(target, { force: true });
          reject(error);
        };
        signal?.addEventListener('abort', onAbort, { once: true });
        for (const [name, value] of Object.entries(req.headers ?? {})) {
          request.setHeader(name, value);
        }
        request.on('redirect', (_status, _method, redirectUrl) => {
          if (downloadAllowedUrl(redirectUrl)) {
            finalUrl = redirectUrl;
            wait();
            request.followRedirect();
          } else {
            fail(new Error(`Redirected off the allowed sites: ${redirectUrl}`));
          }
        });
        request.on('response', response => {
          const status = response.statusCode;
          if (status < 200 || status >= 300) {
            fail(
              new Error(
                `Unable to download a file: server returned HTTP ${status}`,
              ),
            );
            return;
          }
          const length = [response.headers['content-length']].flat()[0];
          const total = Number(length) || 0;
          let written = 0;
          wait();
          const stream = fs.createWriteStream(target);
          out = stream;
          stream.on('error', fail);
          response.on('data', chunk => {
            if (done) {
              return;
            }
            written += chunk.length;
            wait();
            stream.write(chunk);
            onProgress?.(written, total);
          });
          response.on('error', fail);
          response.on('end', () => {
            clearTimeout(timer);
            stream.end(() => {
              if (!done) {
                done = true;
                signal?.removeEventListener('abort', onAbort);
                markDownloaded(target, finalUrl, platform);
                resolve({ status });
              }
            });
          });
        });
        request.on('error', fail);
        wait();
        request.end();
      }),
  };
};

/** What the page may ask of `createFiles` by name (the `files` channel). */
export const FILE_OPERATIONS = new Set([
  'roots',
  'info',
  'list',
  'makeDirectory',
  'remove',
  'move',
  'copy',
  'write',
  'read',
]);

/**
 * Runs one of the page's synchronous file operations: its result, or its
 * error's message (an unknown operation's too), as the page's stand-in reads
 * them (src/web/packages/fileSystem.ts).
 */
export const runFileOperation = (
  files: Files,
  op: unknown,
  args: unknown[],
): { result: unknown } | { error: string } => {
  try {
    if (typeof op !== 'string' || !FILE_OPERATIONS.has(op)) {
      throw new Error(`Unknown file operation: ${String(op)}`);
    }
    const operation = files[op as keyof Files] as (
      ...args: unknown[]
    ) => unknown;
    return { result: operation(...args) };
  } catch (error) {
    return { error: String((error as Error).message) };
  }
};

export type Files = ReturnType<typeof createFiles>;
