// Chromium's PDF viewer (the file preview's PDFs, electron/fileShell.ts) is
// always dark, but declares no color scheme, so Chromium draws its scroll bars
// light, also with the system in dark mode (crbug.com/40779507). Its frames
// get `color-scheme: dark` as they load, so they're drawn dark as the rest of
// the viewer: the viewer's own page (the toolbar and thumbnails), and the
// document Chromium writes for the pages, which is a child of it and scrolls
// them.

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

/** A frame of the PDF viewer's: its page, or the pages' document in it. */
export const isPdfViewerFrame = (frame: Frame) =>
  frame.origin === PDF_VIEWER_ORIGIN ||
  frame.parent?.origin === PDF_VIEWER_ORIGIN;

/** Draws the scroll bars of the PDF viewers `contents` shows dark. */
export const darkenPdfViewers = (contents: {
  on(
    event: 'frame-created',
    listener: (event: unknown, details: { frame: Frame | null }) => void,
  ): unknown;
}) =>
  contents.on('frame-created', (_event, { frame }) => {
    frame?.on('dom-ready', () => {
      if (!frame.isDestroyed() && isPdfViewerFrame(frame)) {
        frame
          .executeJavaScript(
            "document.documentElement.style.colorScheme = 'dark'",
          )
          // The frame went away as it loaded.
          .catch(() => {});
      }
    });
  });
