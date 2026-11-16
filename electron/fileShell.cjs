// What the page does with files outside learnX's own folders, always through
// a dialog the user answers or the system's own apps: opening a download in
// its default app, showing it in the file manager, saving a copy where the
// user picks (Save As), picking a folder for an export, picking files to
// submit, and serving a download to the file preview (`app://files/`).
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

/** Where picked files are copied, under the cache folder. */
const PICKED_DIR = 'picked';

/**
 * What the file preview may show (`app://files/`), by extension: PDFs in
 * Chromium's viewer, and images. Anything else (a page, a script, an SVG
 * that could run one) is refused.
 */
const PREVIEW_TYPES = /** @type {Record<string, string>} */ ({
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  avif: 'image/avif',
  ico: 'image/x-icon',
});

/** Types a picked file is reported as, by extension; others are generic. */
const PICKED_TYPES = /** @type {Record<string, string>} */ ({
  ...PREVIEW_TYPES,
  txt: 'text/plain',
  zip: 'application/zip',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  heic: 'image/heic',
});

const extensionOf = (/** @type {string} */ name) =>
  path.extname(name).slice(1).toLowerCase();

/** A name for a file the user saves: no folders, nothing the system forbids. */
const safeName = (/** @type {unknown} */ name) => {
  const base = path.basename(String(name ?? '')).replace(/[\\/:*?"<>|]/g, '_');
  return base.trim() || 'learnX';
};

/**
 * @typedef {object} FileShellDeps
 * @property {Pick<Electron.Dialog, 'showOpenDialog' | 'showSaveDialog'>} dialog
 * @property {Pick<Electron.Shell, 'openPath' | 'showItemInFolder'>} shell
 * @property {{ grant: (dir: string) => string, localPath: (uri: string) => string, roots: () => { cache: string, document: string } }} files
 * @property {string} cacheDir the cache folder's path
 * @property {() => string} [defaultDir] where save dialogs start
 * @property {() => string} [uniqueId]
 */

/** @param {FileShellDeps} deps */
const createFileShell = ({
  dialog,
  shell,
  files,
  cacheDir,
  defaultDir = () => '',
  uniqueId = () =>
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
}) => {
  /**
   * The path of one of learnX's own files; throws for a folder or anything
   * outside its folders.
   * @param {unknown} uri
   */
  const ownFile = uri => {
    const file = files.localPath(/** @type {string} */ (uri));
    if (!fs.statSync(file).isFile()) {
      throw new Error('Not a file');
    }
    return file;
  };

  /**
   * @param {Electron.BrowserWindow | null} win
   * @param {Electron.SaveDialogOptions} options
   */
  const askWhereToSave = async (win, options) => {
    const result = win
      ? await dialog.showSaveDialog(win, options)
      : await dialog.showSaveDialog(options);
    return result.canceled || !result.filePath ? null : result.filePath;
  };

  return {
    /**
     * Opens a download in the system's default app for its type. Resolves to
     * an error message, or '' when it opened.
     * @param {unknown} uri
     */
    open: async uri => shell.openPath(ownFile(uri)),

    /** @param {unknown} uri */
    showInFolder: uri => {
      shell.showItemInFolder(ownFile(uri));
    },

    /**
     * Asks where to save a copy of a download, named `name`, and copies it
     * there. Resolves to the path saved to, or null when cancelled.
     * @param {Electron.BrowserWindow | null} win
     * @param {unknown} uri
     * @param {unknown} name
     */
    saveAs: async (win, uri, name) => {
      const source = ownFile(uri);
      const fileName = safeName(name);
      const target = await askWhereToSave(win, {
        defaultPath: path.join(defaultDir(), fileName),
      });
      if (!target) {
        return null;
      }
      await fs.promises.copyFile(source, target);
      return target;
    },

    /**
     * Asks where to save text (an exported calendar) named `name`, and
     * writes it there. Resolves to the path, or null when cancelled.
     * @param {Electron.BrowserWindow | null} win
     * @param {unknown} name
     * @param {unknown} content
     */
    saveText: async (win, name, content) => {
      const fileName = safeName(name);
      const extension = extensionOf(fileName);
      const target = await askWhereToSave(win, {
        defaultPath: path.join(defaultDir(), fileName),
        filters: extension
          ? [{ name: extension.toUpperCase(), extensions: [extension] }]
          : [],
      });
      if (!target) {
        return null;
      }
      await fs.promises.writeFile(target, String(content));
      return target;
    },

    /**
     * Asks for a folder (an export's destination) and lets the page write
     * in it. Resolves to its URI, or null when cancelled.
     * @param {Electron.BrowserWindow | null} win
     */
    pickDirectory: async win => {
      /** @type {Electron.OpenDialogOptions} */
      const options = { properties: ['openDirectory', 'createDirectory'] };
      const result = win
        ? await dialog.showOpenDialog(win, options)
        : await dialog.showOpenDialog(options);
      const [dir] = result.filePaths;
      return result.canceled || !dir ? null : files.grant(dir);
    },

    /**
     * Asks for files to submit (`images` limits it to pictures and videos)
     * and copies each into the cache, as expo-document-picker's
     * `copyToCacheDirectory` does. Resolves to the copies, or null when
     * cancelled.
     * @param {Electron.BrowserWindow | null} win
     * @param {{ images?: boolean, multiple?: boolean }} [options]
     */
    pickFiles: async (win, { images = false, multiple = false } = {}) => {
      /** @type {Electron.OpenDialogOptions} */
      const options = {
        properties: multiple ? ['openFile', 'multiSelections'] : ['openFile'],
        filters: images
          ? [
              {
                name: 'Images',
                extensions: [
                  'png',
                  'jpg',
                  'jpeg',
                  'gif',
                  'webp',
                  'heic',
                  'bmp',
                  'mp4',
                  'mov',
                ],
              },
            ]
          : [],
      };
      const result = win
        ? await dialog.showOpenDialog(win, options)
        : await dialog.showOpenDialog(options);
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      return Promise.all(
        result.filePaths.map(async source => {
          const name = path.basename(source);
          const dir = path.join(cacheDir, PICKED_DIR, uniqueId());
          await fs.promises.mkdir(dir, { recursive: true });
          const target = path.join(dir, name);
          await fs.promises.copyFile(source, target);
          const { size } = await fs.promises.stat(target);
          return {
            uri: pathToFileURL(target).href,
            name,
            size,
            mimeType: PICKED_TYPES[extensionOf(name)] ?? null,
          };
        }),
      );
    },

    /**
     * Serves one of learnX's files to the preview at
     * `app://files/<cache|document>/<path>`, PDFs and images only, on an
     * origin of its own so a file never reaches the app's page or its
     * bridge.
     * @param {Request} request
     * @param {(url: string) => Promise<Response>} fetchFile
     */
    servePreview: async (request, fetchFile) => {
      const { pathname } = new URL(request.url);
      const [, root, ...rest] = pathname.split('/');
      const roots = /** @type {Record<string, string>} */ (files.roots());
      const rootUri =
        root === 'cache' || root === 'document' ? roots[root] : '';
      try {
        if (!rootUri || rest.length === 0) {
          throw new Error('Not a file');
        }
        const file = ownFile(`${rootUri}${rest.join('/')}`);
        const type = PREVIEW_TYPES[extensionOf(file)];
        if (!type) {
          return new Response('Not previewable', { status: 403 });
        }
        const response = await fetchFile(pathToFileURL(file).href);
        return new Response(response.body, {
          status: 200,
          headers: {
            'Content-Type': type,
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'no-store',
          },
        });
      } catch {
        return new Response('Not found', { status: 404 });
      }
    },
  };
};

module.exports = {
  createFileShell,
  PICKED_DIR,
  PREVIEW_TYPES,
  safeName,
};
