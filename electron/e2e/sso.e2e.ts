// .maestro/01-login-check.yaml, as far as the Electron app goes without a
// test login (the web build isn't a TEST_LOGIN build): a username that isn't
// the mock account's opens Tsinghua's login page in a web view, after the
// confirmation, and the page's script fills in learnX's form there. Nothing
// is sent to Tsinghua: the made-up account is never submitted. Needs
// id.tsinghua.edu.cn, which CI's runners abroad can't always reach: tagged
// @network, and skipped (not failed) when it doesn't answer, whether before
// the test or when the web view loads it.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { exact } from './maestroEnv.ts';

const NOBODY = 'learnx-e2e-nobody';
const SSO = 'https://id.tsinghua.edu.cn/';

/** Whether Tsinghua's login site answers within a few seconds. */
const reachable = async () => {
  try {
    await fetch(SSO, { method: 'HEAD', signal: AbortSignal.timeout(10_000) });
    return true;
  } catch {
    return false;
  }
};

test.beforeEach(async () => {
  test.skip(!(await reachable()), `${SSO} doesn't answer from here`);
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

interface LoadFailure {
  code: number;
  description: string;
  url: string;
}

/**
 * Keeps the web view's failed main frame loads in the page, from the
 * `did-fail-load` events Electron sends the <webview>. They don't bubble, so
 * a capturing listener on the document hears them. Call it before the web
 * view opens.
 */
const recordLoadFailures = (window: Page) =>
  window.evaluate(() => {
    const failures: LoadFailure[] = [];
    Object.assign(globalThis, { e2eLoadFailures: failures });
    document.addEventListener(
      'did-fail-load',
      event => {
        const { errorCode, errorDescription, validatedURL, isMainFrame } =
          event as Event & {
            errorCode: number;
            errorDescription: string;
            validatedURL: string;
            isMainFrame: boolean;
          };
        if (isMainFrame) {
          failures.push({
            code: errorCode,
            description: errorDescription,
            url: validatedURL,
          });
        }
      },
      true,
    );
  });

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
 * Waits for the web view to show Tsinghua's login page. When the web view
 * couldn't load it for the network's sake (recordLoadFailures), the site
 * stopped answering after the check before the test, so this skips as that
 * check does.
 */
const expectSSOPage = async (window: Page) => {
  let failure: LoadFailure | undefined;
  await expect
    .poll(
      async () => {
        const failures = await window.evaluate(
          () =>
            (globalThis as unknown as { e2eLoadFailures: LoadFailure[] })
              .e2eLoadFailures,
        );
        failure = failures.find(
          ({ code, url }) => url.startsWith(SSO) && isNetworkError(code),
        );
        return failure ? 'failed' : guest(window, 'location.hostname');
      },
      { timeout: 30_000 },
    )
    .toMatch(/^(?:id\.tsinghua\.edu\.cn|failed)$/);
  test.skip(
    failure !== undefined,
    `${SSO} stopped answering: ${failure?.description} (${failure?.code})`,
  );
};

const fillLogin = async (window: Page) => {
  await window.getByTestId('welcome-continue').click();
  await window.getByTestId('login-username').fill(NOBODY);
  await window.getByTestId('login-password').fill('not-a-password');
  await recordLoadFailures(window);
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
