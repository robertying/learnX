import { EventEmitter } from 'node:events';
import { PDF_VIEWER_ORIGIN, darkenPdfViewers } from '../pdfViewer.ts';

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

const load = (origin: string, parentOrigin: string | null) => {
  const contents = new EventEmitter();
  darkenPdfViewers(contents);
  const created = frame(origin, parentOrigin);
  contents.emit('frame-created', {}, { frame: created });
  return created;
};

it("darkens the viewer's page and the pages' document in it", () => {
  for (const loaded of [
    load(PDF_VIEWER_ORIGIN, 'app://files'),
    load('app://files', PDF_VIEWER_ORIGIN),
  ]) {
    loaded.emit('dom-ready');
    expect(loaded.executeJavaScript).toHaveBeenCalledWith(
      "document.documentElement.style.colorScheme = 'dark'",
    );
  }
});

it('leaves other frames alone', () => {
  for (const loaded of [
    load('app://learnx', null),
    // The preview's frame, which the viewer is in.
    load('app://files', 'app://learnx'),
    load('https://learn.tsinghua.edu.cn', 'app://learnx'),
  ]) {
    loaded.emit('dom-ready');
    expect(loaded.executeJavaScript).not.toHaveBeenCalled();
  }
});

it('skips a frame that went away, or failed to run it', async () => {
  const gone = load(PDF_VIEWER_ORIGIN, 'app://files');
  gone.destroyed = true;
  gone.emit('dom-ready');
  expect(gone.executeJavaScript).not.toHaveBeenCalled();

  const failing = load(PDF_VIEWER_ORIGIN, 'app://files');
  failing.executeJavaScript.mockRejectedValueOnce(new Error('Frame gone'));
  failing.emit('dom-ready');
  await Promise.resolve();
  expect(failing.executeJavaScript).toHaveBeenCalled();
});

it('takes no frame', () => {
  const contents = new EventEmitter();
  darkenPdfViewers(contents);
  expect(() =>
    contents.emit('frame-created', {}, { frame: null }),
  ).not.toThrow();
});
