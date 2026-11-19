import { EventEmitter } from 'node:events';
import { PDF_VIEWER_ORIGIN, themePdfViewers } from '../pdfViewer.ts';

const scheme = (value: string) =>
  `document.documentElement.style.colorScheme = '${value}'`;

const frame = (origin: string, parentOrigin: string | null) =>
  Object.assign(new EventEmitter(), {
    origin,
    parent: parentOrigin === null ? null : { origin: parentOrigin },
    destroyed: false,
    isDestroyed() {
      return this.destroyed;
    },
    executeJavaScript: jest.fn(() => Promise.resolve()),
  });
type Frame = ReturnType<typeof frame>;

const setUp = (dark = true) => {
  const frames: Frame[] = [];
  const contents = Object.assign(new EventEmitter(), {
    destroyed: false,
    isDestroyed() {
      return this.destroyed;
    },
    mainFrame: { framesInSubtree: frames },
  });
  const theme = Object.assign(new EventEmitter(), {
    shouldUseDarkColors: dark,
  });
  themePdfViewers(contents, theme);
  const load = (origin: string, parentOrigin: string | null) => {
    const created = frame(origin, parentOrigin);
    frames.push(created);
    contents.emit('frame-created', {}, { frame: created });
    created.emit('dom-ready');
    return created;
  };
  return { contents, theme, load };
};

it("gives the viewer's page and the pages' document the app's scheme", () => {
  for (const dark of [true, false]) {
    const { load } = setUp(dark);
    for (const loaded of [
      load(PDF_VIEWER_ORIGIN, 'app://files'),
      load('app://files', PDF_VIEWER_ORIGIN),
    ]) {
      expect(loaded.executeJavaScript).toHaveBeenCalledWith(
        scheme(dark ? 'dark' : 'light'),
      );
    }
  }
});

it('follows the appearance as it changes', () => {
  const { contents, theme, load } = setUp(true);
  const viewer = load(PDF_VIEWER_ORIGIN, 'app://files');
  const page = load('app://learnx', null);
  theme.shouldUseDarkColors = false;
  theme.emit('updated');
  expect(viewer.executeJavaScript).toHaveBeenLastCalledWith(scheme('light'));
  expect(page.executeJavaScript).not.toHaveBeenCalled();

  // Not once the contents are gone.
  contents.destroyed = true;
  theme.emit('updated');
  contents.emit('destroyed');
  expect(theme.listenerCount('updated')).toBe(0);
  expect(viewer.executeJavaScript).toHaveBeenCalledTimes(2);
});

it('leaves other frames alone', () => {
  const { load } = setUp();
  for (const loaded of [
    load('app://learnx', null),
    // The preview's frame, which the viewer is in.
    load('app://files', 'app://learnx'),
    load('https://learn.tsinghua.edu.cn', 'app://learnx'),
  ]) {
    expect(loaded.executeJavaScript).not.toHaveBeenCalled();
  }
});

it('skips a frame that went away, or failed to run it', async () => {
  const { theme, load } = setUp();
  const failing = load(PDF_VIEWER_ORIGIN, 'app://files');
  failing.executeJavaScript.mockRejectedValueOnce(new Error('Frame gone'));
  theme.emit('updated');
  await Promise.resolve();
  expect(failing.executeJavaScript).toHaveBeenCalledTimes(2);

  failing.destroyed = true;
  theme.emit('updated');
  expect(failing.executeJavaScript).toHaveBeenCalledTimes(2);
});

it('takes no frame', () => {
  const { contents } = setUp();
  expect(() =>
    contents.emit('frame-created', {}, { frame: null }),
  ).not.toThrow();
});
