// A notice body too large for a data URL (Chromium refuses URLs over 2 MB):
// the main process serves it at its base URL instead (webviews.ts,
// `loadHtml`), as the phones' web views load HTML of any size.
import { expect, test } from './fixtures.ts';
import { byId, openCard, openTab } from './steps.ts';

test('shows a 3 MB notice body at its base URL', async ({ window, login }) => {
  await login();
  await openTab(window, 'notices');
  await openCard(window, 'MOCK_NOTICE', 'notice-detail');
  const view = byId(window, 'notice-detail').locator('webview').first();
  await expect(view).toBeAttached();

  const shown = () =>
    view.evaluate(element =>
      (
        element as HTMLElement & {
          executeJavaScript(code: string): Promise<unknown>;
        }
      )
        .executeJavaScript(
          'JSON.stringify([location.href, document.querySelectorAll("p").length, !!document.getElementById("end")])',
        )
        .catch(() => null),
    );
  // The notice's own body first, so its load doesn't replace this one.
  await expect
    .poll(shown, { timeout: 30_000 })
    .toMatch(/^\["https:\/\/learn\.tsinghua\.edu\.cn\/",[1-9]\d*,false\]$/);

  // About 3 MB of Chinese text (1,000 characters of 3 bytes a paragraph),
  // which would be 9 MB as a data URL.
  const paragraphs = 1000;
  const loaded = await view.evaluate(async (element, count) => {
    const webview = element as HTMLElement & { getWebContentsId(): number };
    const html = `<!doctype html><meta charset="utf-8"><body>${'<p>公告正文……</p>'.padEnd(1000, '。').repeat(count)}<p id="end">end</p></body>`;
    return (
      window as unknown as {
        learnx: {
          webviews: {
            loadHtml: (
              id: number,
              html: string,
              url: string,
            ) => Promise<boolean>;
          };
        };
      }
    ).learnx.webviews.loadHtml(
      webview.getWebContentsId(),
      html,
      'https://learn.tsinghua.edu.cn/',
    );
  }, paragraphs);
  expect(loaded).toBe(true);

  await expect
    .poll(shown, { timeout: 30_000 })
    .toBe(
      JSON.stringify(['https://learn.tsinghua.edu.cn/', paragraphs + 1, true]),
    );
});
