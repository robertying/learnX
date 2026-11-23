// .maestro/01-login-check.yaml, as far as the Electron app goes without a
// test login (the web build isn't a TEST_LOGIN build): a username that isn't
// the mock account's opens Tsinghua's login page in a web view, after the
// confirmation, and the page's script fills in learnX's form there. Nothing
// is sent to Tsinghua: the made-up account is never submitted. Needs
// learn.tsinghua.edu.cn, where the web view starts, and id.tsinghua.edu.cn,
// where it lands, which CI's runners abroad can't always reach: tagged
// @network, and skipped (not failed) when they don't answer, whether before
// the test or while the web view loads them.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { exact } from './maestroEnv.ts';

const NOBODY = 'learnx-e2e-nobody';
/** The sites the web view loads, in order (SSO.tsx's SSO_LOGIN_URL). */
const SITES = ['https://learn.tsinghua.edu.cn/', 'https://id.tsinghua.edu.cn/'];

/** Whether `url` is on one of Tsinghua's sites. */
const isTsinghua = (url: string) => {
  try {
    return new URL(url).hostname.endsWith('.tsinghua.edu.cn');
  } catch {
    return false;
  }
};

/**
 * Why one of the sites doesn't answer within a few seconds, as the site and
 * the error's code (ECONNRESET, UND_ERR_CONNECT_TIMEOUT, TimeoutError...),
 * or null when all of them answer, whatever their status.
 */
const unreachable = async () => {
  for (const site of SITES) {
    try {
      await fetch(site, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      const { cause, name } = error as Error & {
        cause?: { code?: string };
      };
      return `${site}: ${cause?.code ?? name}`;
    }
  }
  return null;
};

test.beforeEach(async () => {
  const reason = await unreachable();
  test.skip(reason !== null, `Doesn't answer from here: ${reason}`);
});

/**
 * Runs `script` in the SSO screen's web view, as the page can: null until
 * the web view is there and ready (`dom-ready`).
 */
const guest = (window: Page, script: string) =>
  window.evaluate(async js => {
    const webview = document.querySelector('webview') as unknown as {
      executeJavaScript: (code: string) => Promise<unknown>;
    } | null;
    try {
      return (await webview?.executeJavaScript(js)) ?? null;
    } catch {
      return null;
    }
  }, script);

/** The web view's main frame loads, as recordLoads keeps them. */
interface Loads {
  /** The page it last started to load. */
  url: string | null;
  /** Whether that page got as far as `dom-ready`. */
  ready: boolean;
  /** Its failed loads. */
  failures: { code: number; description: string; url: string }[];
}

/**
 * Keeps the web view's main frame loads in the page, from the events
 * Electron sends the <webview>. They don't bubble, so capturing listeners on
 * the document hear them. Call it before the web view opens.
 */
const recordLoads = (window: Page) =>
  window.evaluate(() => {
    const loads: Loads = { url: null, ready: false, failures: [] };
    Object.assign(globalThis, { e2eLoads: loads });
    type WebviewEvent = Event & {
      url: string;
      isMainFrame: boolean;
      errorCode: number;
      errorDescription: string;
      validatedURL: string;
    };
    document.addEventListener(
      'did-start-navigation',
      event => {
        const { url, isMainFrame } = event as WebviewEvent;
        if (isMainFrame) {
          loads.url = url;
          loads.ready = false;
        }
      },
      true,
    );
    document.addEventListener(
      'dom-ready',
      () => {
        loads.ready = true;
      },
      true,
    );
    document.addEventListener(
      'did-fail-load',
      event => {
        const { errorCode, errorDescription, validatedURL, isMainFrame } =
          event as WebviewEvent;
        if (isMainFrame) {
          loads.failures.push({
            code: errorCode,
            description: errorDescription,
            url: validatedURL,
          });
        }
      },
      true,
    );
  });

const loadsSoFar = (window: Page) =>
  window.evaluate(
    () => (globalThis as unknown as { e2eLoads: Loads }).e2eLoads,
  );

/**
 * Whether a Chromium net error is the network's: a time out (-7), a changed
 * network (-21), a connection or host name error (-100 to -199) or an empty
 * answer (-324). Not a load the app stopped (-3) or blocked (-20), nor a
 * certificate (-2xx) or other HTTP (-3xx) error.
 */
const isNetworkError = (code: number) =>
  code === -7 ||
  code === -21 ||
  code === -324 ||
  (code <= -100 && code >= -199);

/**
 * Waits for the web view to show Tsinghua's login page. The sites can stop
 * answering after the check before the test, so this skips as that check
 * does when the web view's load of one of them fails with a network error,
 * or is still loading one of them when the wait ends.
 */
const expectSSOPage = async (window: Page) => {
  const networkFailure = ({ failures }: Loads) =>
    failures.find(({ code, url }) => isTsinghua(url) && isNetworkError(code));
  let reason: string | undefined;
  try {
    await expect
      .poll(
        async () =>
          networkFailure(await loadsSoFar(window))
            ? 'failed'
            : guest(window, 'location.hostname'),
        { timeout: 30_000 },
      )
      .toMatch(/^(?:id\.tsinghua\.edu\.cn|failed)$/);
  } catch (error) {
    // A failure may land just as the wait ends.
    const loads = await loadsSoFar(window);
    if (networkFailure(loads) === undefined) {
      if (loads.ready || loads.url === null || !isTsinghua(loads.url)) {
        throw error;
      }
      reason = `${loads.url}: still loading after 30 s`;
    }
  }
  const failure = networkFailure(await loadsSoFar(window));
  if (failure) {
    reason = `${failure.url}: ${failure.description} (${failure.code})`;
  }
  test.skip(reason !== undefined, `Stopped answering: ${reason}`);
};

const fillLogin = async (window: Page) => {
  await window.getByTestId('welcome-continue').click();
  await window.getByTestId('login-username').fill(NOBODY);
  await window.getByTestId('login-password').fill('not-a-password');
  await recordLoads(window);
};

test(
  'opens Tsinghua’s login page for an account that isn’t the mock',
  { tag: '@network' },
  async ({ window }) => {
    await fillLogin(window);
    await window.getByRole('button', { name: exact('T_login') }).click();
    await window.getByRole('button', { name: exact('T_continue') }).click();

    await expectSSOPage(window);
    // learnX's script filled in the form, which stays unsent.
    await expect
      .poll(
        () => guest(window, "document.querySelector('#i_user')?.value ?? null"),
        { timeout: 30_000 },
      )
      .toBe(NOBODY);
  },
);

test(
  'stays on the login page when the confirmation is cancelled',
  { tag: '@network' },
  async ({ window }) => {
    await fillLogin(window);
    await window.getByRole('button', { name: exact('T_login') }).click();
    await window.getByRole('button', { name: exact('T_cancel') }).click();
    await expect(window.getByTestId('login-username')).toBeVisible();
    await expect(window.locator('webview')).toHaveCount(0);
  },
);

test(
  'asks before opening Tsinghua’s page when Enter logs in',
  { tag: '@network' },
  async ({ window }) => {
    // The Enter that logs in from the password field opens the confirmation,
    // which focuses Continue: that same press mustn't answer it (web/alert).
    await fillLogin(window);
    await window.getByTestId('login-password').press('Enter');
    const dialog = window.getByRole('dialog');
    await expect(
      dialog.getByRole('button', { name: exact('T_continue') }),
    ).toBeFocused();
    await expect(window.locator('webview')).toHaveCount(0);
    // Its own press does.
    await window.keyboard.press('Enter');
    await expectSSOPage(window);
  },
);
