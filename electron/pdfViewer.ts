// Chromium's PDF viewer (the file preview's PDFs, electron/fileShell.ts)
// declares no color scheme and always reports `prefers-color-scheme: dark`,
// so Chromium draws its scroll bars light with any appearance
// (crbug.com/40779507). Its frames get the window's color scheme as they
// load, and again when the system's appearance changes, so their scroll bars
// match the rest of the app's: the viewer's own page (the toolbar and
// thumbnails), and the document Chromium writes for the pages, which is a
// child of it and scrolls them.

/** The PDF viewer's origin: the extension built into Chromium. */
export const PDF_VIEWER_ORIGIN =
  'chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai';

type Frame = Pick<
  Electron.WebFrameMain,
  'origin' | 'isDestroyed' | 'executeJavaScript'
> & {
  parent: Pick<Electron.WebFrameMain, 'origin'> | null;
  on(event: 'dom-ready', listener: () => void): unknown;
};

type Contents = {
  isDestroyed(): boolean;
  mainFrame: { framesInSubtree: Frame[] };
  on(
    event: 'frame-created',
    listener: (event: unknown, details: { frame: Frame | null }) => void,
  ): unknown;
  once(event: 'destroyed', listener: () => void): unknown;
};

type Theme = {
  shouldUseDarkColors: boolean;
  on(event: 'updated', listener: () => void): unknown;
  off(event: 'updated', listener: () => void): unknown;
};

/** A frame of the PDF viewer's: its page, or the pages' document in it. */
export const isPdfViewerFrame = (frame: Frame) =>
  frame.origin === PDF_VIEWER_ORIGIN ||
  frame.parent?.origin === PDF_VIEWER_ORIGIN;

/**
 * Draws the scroll bars of the PDF viewers `contents` shows in the app's
 * appearance (`theme`, Electron's `nativeTheme`).
 */
export const themePdfViewers = (contents: Contents, theme: Theme) => {
  const apply = (frame: Frame) => {
    if (!frame.isDestroyed() && isPdfViewerFrame(frame)) {
      const scheme = theme.shouldUseDarkColors ? 'dark' : 'light';
      frame
        .executeJavaScript(
          `document.documentElement.style.colorScheme = '${scheme}'`,
        )
        // The frame went away as it loaded.
        .catch(() => {});
    }
  };
  contents.on('frame-created', (_event, { frame }) => {
    frame?.on('dom-ready', () => apply(frame));
  });
  const update = () => {
    if (!contents.isDestroyed()) {
      contents.mainFrame.framesInSubtree.forEach(apply);
    }
  };
  theme.on('updated', update);
  contents.once('destroyed', () => theme.off('updated', update));
};
