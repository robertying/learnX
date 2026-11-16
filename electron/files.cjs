// learnX's own files (downloads, drafts, exports in the making) for the page,
// which has no file system: expo-file-system's stand-in
// (src/web/packages/fileSystem.ts) calls these over IPC. Every path must lie
// in one of the app's folders under its data folder, `cache` and `document`,
// as on the phone, or in a folder the user picked for an export (`grant`).
// Downloads run here with the window session's cookies.
const fs = require('node:fs');
const path = require('node:path');
const { fileURLToPath, pathToFileURL } = require('node:url');
const { allowedUrl } = require('./net.cjs');

/** Where the mock account's files come from (src/data/mock.ts). */
const MOCK_FILES =
  'https://raw.githubusercontent.com/robertying/learnX/main/mock-files/';

/**
 * Whether a download may come from `url`: Tsinghua's sites and courseX, as
 * every request, or the mock account's files.
 * @param {string} url
 */
const downloadAllowedUrl = url => allowedUrl(url) || url.startsWith(MOCK_FILES);

/**
 * @typedef {object} EntryInfo
 * @property {boolean} exists
 * @property {boolean} isDirectory
 * @property {number} size bytes; a folder's is everything in it
 */

/** @param {string} dir */
const sizeOf = dir => {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? sizeOf(full) : fs.statSync(full).size;
  }
  return total;
};

/**
 * @param {{ cache: string, document: string }} roots absolute folder paths
 */
const createFiles = roots => {
  const rootPaths = Object.values(roots).map(root => path.resolve(root));
  for (const root of rootPaths) {
    fs.mkdirSync(root, { recursive: true });
  }
  /** Folders the user picked in a folder dialog, which exports write into. */
  const granted = new Set(/** @type {string[]} */ ([]));
  const allowedRoots = () => [...rootPaths, ...granted];

  /**
   * The path of a file URI inside the app's folders; throws for anything
   * else, a folder itself included.
   * @param {unknown} uri
   */
  const pathOf = uri => {
    if (typeof uri !== 'string' || !uri.startsWith('file:')) {
      throw new Error('Not a file URI');
    }
    const resolved = path.resolve(fileURLToPath(uri));
    if (
      !allowedRoots().some(
        root => resolved === root || resolved.startsWith(root + path.sep),
      )
    ) {
      throw new Error('Outside the app folders');
    }
    return resolved;
  };

  /** A path that may be changed: inside a folder, never a folder itself. */
  const innerPathOf = (/** @type {unknown} */ uri) => {
    const resolved = pathOf(uri);
    if (allowedRoots().includes(resolved)) {
      throw new Error('The app folders themselves stay');
    }
    return resolved;
  };

  return {
    /**
     * Lets the page work in a folder the user picked (a dialog in the main
     * process, never the page's own choice), and returns its URI.
     * @param {string} dir an absolute path
     */
    grant: dir => {
      const resolved = path.resolve(dir);
      granted.add(resolved);
      return pathToFileURL(resolved + path.sep).href;
    },

    /**
     * The path of a file URI in the app's folders (or a granted one), for
     * the main process's own use; throws for anything else.
     * @param {string} uri
     */
    localPath: uri => pathOf(uri),

    /** The folders' URIs, ending in a slash. */
    roots: () => {
      const uriOf = (/** @type {string} */ root) =>
        pathToFileURL(path.resolve(root) + path.sep).href;
      return { cache: uriOf(roots.cache), document: uriOf(roots.document) };
    },

    /**
     * @param {string} uri
     * @returns {EntryInfo}
     */
    info: uri => {
      const target = pathOf(uri);
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

    /**
     * @param {string} uri
     * @returns {{ name: string, isDirectory: boolean }[]}
     */
    list: uri =>
      fs
        .readdirSync(pathOf(uri), { withFileTypes: true })
        .map(entry => ({ name: entry.name, isDirectory: entry.isDirectory() })),

    /**
     * @param {string} uri
     * @param {{ intermediates?: boolean, idempotent?: boolean }} [options]
     */
    makeDirectory: (
      uri,
      { intermediates = false, idempotent = false } = {},
    ) => {
      const target = pathOf(uri);
      if (fs.existsSync(target)) {
        if (idempotent && fs.statSync(target).isDirectory()) {
          return;
        }
        throw new Error('Already exists');
      }
      fs.mkdirSync(target, { recursive: intermediates });
    },

    /** @param {string} uri */
    remove: uri => {
      fs.rmSync(innerPathOf(uri), { recursive: true, force: true });
    },

    /**
     * @param {string} from
     * @param {string} to
     * @param {boolean} [overwrite]
     */
    move: (from, to, overwrite = false) => {
      const source = innerPathOf(from);
      const target = innerPathOf(to);
      if (!overwrite && fs.existsSync(target)) {
        throw new Error('Already exists');
      }
      fs.rmSync(target, { recursive: true, force: true });
      fs.renameSync(source, target);
    },

    /**
     * @param {string} from
     * @param {string} to
     * @param {boolean} [overwrite]
     */
    copy: (from, to, overwrite = false) => {
      fs.cpSync(pathOf(from), innerPathOf(to), {
        recursive: true,
        force: overwrite,
        errorOnExist: !overwrite,
      });
    },

    /**
     * @param {string} uri
     * @param {string | Uint8Array} content
     */
    write: (uri, content) => {
      fs.writeFileSync(innerPathOf(uri), content);
    },

    /**
     * @param {string} uri
     * @param {'utf8' | 'bytes'} as
     */
    read: (uri, as) => {
      const data = fs.readFileSync(pathOf(uri));
      return as === 'utf8' ? data.toString('utf8') : new Uint8Array(data);
    },

    /**
     * Downloads `url` into `uri` with the session's cookies, following
     * redirects on the allowed sites (`downloadAllowedUrl`). Rejects on a status other than 2xx as
     * expo-file-system does ("Unable to download a file: server returned
     * HTTP 403"), leaving no file behind.
     *
     * @param {Pick<typeof import('electron').net, 'request'>} net
     * @param {Electron.Session} session
     * @param {{ url: string, uri: string, headers?: Record<string, string> }} req
     * @param {{ signal?: AbortSignal, onProgress?: (written: number, total: number) => void }} [options]
     * @returns {Promise<{ status: number }>}
     */
    download: (net, session, req, { signal, onProgress } = {}) =>
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
        /** @type {fs.WriteStream | undefined} */
        let out;
        let done = false;
        const fail = (/** @type {Error} */ error) => {
          if (done) {
            return;
          }
          done = true;
          request.abort();
          out?.destroy();
          fs.rmSync(target, { force: true });
          reject(error);
        };
        signal?.addEventListener('abort', () => fail(new Error('Aborted')));
        for (const [name, value] of Object.entries(req.headers ?? {})) {
          request.setHeader(name, value);
        }
        request.on('redirect', (_status, _method, redirectUrl) => {
          if (downloadAllowedUrl(redirectUrl)) {
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
          const stream = fs.createWriteStream(target);
          out = stream;
          stream.on('error', fail);
          response.on('data', chunk => {
            if (done) {
              return;
            }
            written += chunk.length;
            stream.write(chunk);
            onProgress?.(written, total);
          });
          response.on('error', fail);
          response.on('end', () => {
            stream.end(() => {
              if (!done) {
                done = true;
                resolve({ status });
              }
            });
          });
        });
        request.on('error', fail);
        request.end();
      }),
  };
};

module.exports = { createFiles, downloadAllowedUrl };
