// The window really shows, and its page draws, on Windows and Linux: an E2E
// run shows it there behind the others (system.cjs, `present`), since a
// window that was never shown hardly draws: under Wayland it gets no frames,
// so its page never draws, and on Windows about two a second, which made every
// test crawl. CI runs this under a headless Wayland compositor too
// (electron.yml, "Electron window on Wayland"), where such a window fails
// every check; under xvfb's X11 a window draws whether it shows or not.
import { expect, test } from './fixtures';

test('shows the window, with its page drawn at full rate', async ({
  app,
  window,
}) => {
  test.skip(
    process.platform === 'darwin',
    'an E2E run never shows the window on a Mac',
  );
  await window.getByTestId('welcome-continue').waitFor();
  await expect
    .poll(() =>
      app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0]?.isVisible(),
      ),
    )
    .toBe(true);
  // A frame the compositor got: more than the one color the window is
  // filled with before its page draws (none at all if it never showed). A
  // capture can fail before the first frame (Chromium's UnknownVizError, as
  // on CI's runners without a GPU): it counts as no frame and is tried again.
  await expect
    .poll(
      () =>
        app.evaluate(async ({ BrowserWindow }) => {
          const frame = await BrowserWindow.getAllWindows()[0]!
            .webContents.capturePage()
            .catch(() => null);
          if (!frame) {
            return 0;
          }
          const bitmap = frame.toBitmap();
          const colors = new Set<number>();
          for (let i = 0; i + 4 <= bitmap.length && colors.size <= 16; i += 4) {
            colors.add(bitmap.readUInt32LE(i));
          }
          return colors.size;
        }),
      { timeout: 30_000 },
    )
    .toBeGreaterThan(16);
  // Frames at a screen's rate, not a hidden window's few a second: the
  // page's animation frames in one second.
  const frames = await window.evaluate(
    () =>
      new Promise<number>(resolve => {
        let count = 0;
        const start = performance.now();
        const tick = () => {
          count++;
          if (performance.now() - start < 1000) {
            requestAnimationFrame(tick);
          } else {
            resolve(count);
          }
        };
        requestAnimationFrame(tick);
      }),
  );
  expect(frames).toBeGreaterThan(20);
});
