import { Learn2018Helper, type Credential } from '@robertying/thu-learn-lib';
import mime from 'mime';
import CookieManager from '@preeternal/react-native-cookie-manager';
import { noteRequestError, noteSession } from 'data/auth';
import { getCredentials, loadCredentials } from 'data/credentials';
import { mockSource } from 'data/mockSource';
import Urls from 'constants/Urls';
import { isLearnUrl } from 'helpers/learnUrl';
import { isMockUser } from 'helpers/mock';
import {
  assertServerWritesAllowed,
  getServerWritesAllowed,
} from 'helpers/serverWrites';
import { isAndroid, isApple, isElectron } from 'helpers/platform';

/** The part of thu-learn-lib the app calls. */
export type DataSource = Pick<
  Learn2018Helper,
  | 'login'
  | 'ensureSession'
  | 'logout'
  | 'getCSRFToken'
  | 'setLanguage'
  | 'getUserInfo'
  | 'getSemesterIdList'
  | 'getCurrentSemester'
  | 'getCourseList'
  | 'getNotificationList'
  | 'getHomeworkList'
  | 'getExcellentHomeworkDetail'
  | 'getFileList'
  | 'getCalendar'
  | 'addToFavorites'
  | 'removeFromFavorites'
  | 'download'
>;

/** What an assignment submission sends. */
export interface Submission {
  /** The whole answer as HTML, which replaces the submitted one. */
  content?: string;
  attachment?: { uri: string; name: string };
  /** Deletes the submitted attachment. */
  remove?: boolean;
  onProgress?: (progress: number) => void;
}

/**
 * Everything the app asks of the school's server: thu-learn-lib's calls, and
 * the few requests the app wraps. Every request to Web Learning goes through
 * thu-learn-lib, file downloads included (`download`, which a download client
 * only sends), so the session, the CSRF token and errors are handled in one
 * place.
 */
export interface AppSource extends DataSource {
  /**
   * Loads a notice's page, which marks the notice read on the server, as the
   * website does when it's opened.
   */
  markNoticeRead: (url: string) => Promise<void>;
  /**
   * Submits an assignment: `content` is the whole answer as HTML, which
   * replaces the submitted one; `remove` deletes the attachment.
   */
  submitAssignment: (
    studentHomeworkId: string,
    submission: Submission,
  ) => Promise<void>;
}

/**
 * Which server the session talks to, set when a login starts (a login may
 * name another account than the saved one) and forgotten on logout. Before
 * the first login in this JS runtime (a background launch), it's the saved
 * login's.
 */
let sessionServer: 'mock' | 'real' | null = null;

const isMockSession = () =>
  sessionServer
    ? sessionServer === 'mock'
    : isMockUser(getCredentials()?.username);

/** Forgets which server the session used, e.g. on logout. */
export const endSession = () => {
  sessionServer = null;
};

/** A file's bytes, for an upload in the Electron app. */
const fileBlob = async (uri: string, type: string) => {
  const { File } =
    require('expo-file-system') as typeof import('expo-file-system');
  const bytes = await new File(uri).bytes();
  return new Blob([bytes as BlobPart], { type });
};

/** The requests the app wraps: thu-learn-lib's calls, with what the app adds. */
const realRequests: Omit<AppSource, keyof DataSource> = {
  markNoticeRead: async url => {
    // Only Web Learning's own pages: the session cookies go with the request.
    if (isLearnUrl(url)) {
      // thu-learn-lib logs in again and loads it once more when the session
      // has expired.
      await helper.markNotificationRead({ url });
    }
  },
  submitAssignment: async (
    studentHomeworkId,
    { content, attachment, onProgress, remove = false },
  ) => {
    assertServerWritesAllowed('Assignment submission');

    const type = attachment
      ? mime.getType(attachment.uri) || 'application/octet-stream'
      : '';
    // The Electron app's requests go through the main process (web/fetch),
    // which takes the file's bytes, not a URI, and reports no upload
    // progress: XMLHttpRequest would go from the page, where Tsinghua's
    // cookies and cross-origin rules don't allow it.
    const electron = isElectron();
    // thu-learn-lib sends it as every request (an expired session logs in
    // again and it goes once more), with XMLHttpRequest for the progress.
    await helper.submitHomework(studentHomeworkId, {
      content,
      attachment: attachment && {
        filename: attachment.name,
        content: electron
          ? await fileBlob(attachment.uri, type)
          : { uri: attachment.uri, type },
      },
      removeAttachment: remove,
      // Two decimals are plenty for a progress bar.
      onProgress:
        onProgress && !electron
          ? p => onProgress(Math.round(p * 100) / 100)
          : undefined,
    });
  },
};

/** learn.tsinghua.edu.cn, through thu-learn-lib and the requests above. */
const realSource = new Proxy({} as AppSource, {
  get: (_, key: keyof AppSource) => {
    if (key in realRequests) {
      return realRequests[key as keyof typeof realRequests];
    }
    const value = helper[key as keyof DataSource];
    return typeof value === 'function' ? value.bind(helper) : value;
  },
});

/**
 * Talks to learn.tsinghua.edu.cn, or to the emulated server in
 * `data/mockSource` while the session is the mock account's. Picked per call,
 * so logging in or out switches it; nothing else in the app checks for the
 * mock account to pick a server. Every failed call is noted (`noteRequestError`
 * in `data/auth`), so a wrong password found by thu-learn-lib's own re-login
 * ends the session wherever the request came from: a list, a server action, a
 * download or a submission. After every call, the session's token is noted
 * too (`noteSession`), so a login thu-learn-lib ran by itself reloads the web
 * content that needs the session.
 */
export const dataSource = new Proxy({} as AppSource, {
  get: (_, key: keyof AppSource) => {
    const source: AppSource = isMockSession() ? mockSource : realSource;
    const value = source[key];
    if (typeof value !== 'function') {
      return value;
    }
    return (...args: unknown[]) => {
      const result: unknown = (value as (...a: unknown[]) => unknown).apply(
        source,
        args,
      );
      return result instanceof Promise
        ? result.then(
            (resolved: unknown) => {
              noteSession(source.getCSRFToken());
              return resolved;
            },
            (error: unknown) => {
              noteSession(source.getCSRFToken());
              noteRequestError(error);
              throw error;
            },
          )
        : result;
    };
  },
});

/**
 * Whether changes to the account stay on the phone for now: a debug build
 * with a real account, until the Debug page's "Allow Server Writes" is on.
 */
export const serverWritesBlocked = () =>
  !isMockSession() && !getServerWritesAllowed();

/**
 * Forgets the id.tsinghua.edu.cn cookies, so a login starts from the login
 * form without an SSO session: the SSO page has just signed in there, and a
 * login sent with that session isn't answered with a ticket. On iOS the web
 * views keep their cookies in WebKit's store and fetch in Foundation's, so
 * both are cleared; Android has one store, where each cookie is emptied, and
 * the Electron app one session, where each is removed.
 */
export const clearLoginCookies = async () => {
  if (isApple()) {
    await Promise.all(
      (['foundation', 'webKit'] as const).map(async iosCookieStore => {
        const cookies = await CookieManager.get(Urls.id, { iosCookieStore });
        await Promise.all(
          Object.keys(cookies).map(name =>
            CookieManager.clearByName(Urls.id, name, { iosCookieStore }),
          ),
        );
      }),
    );
  } else if (isElectron()) {
    const cookies = await CookieManager.get(Urls.id);
    await Promise.all(
      Object.keys(cookies).map(name =>
        CookieManager.clearByName(Urls.id, name),
      ),
    );
  } else {
    const cookies = await CookieManager.get(Urls.id);
    const names = new Set(['JSESSIONID', ...Object.keys(cookies)]);
    for (const name of names) {
      await CookieManager.setFromResponse(
        Urls.id,
        `${name}=; path=/; HttpOnly`,
      );
    }
    await CookieManager.flush();
  }
};

/**
 * Forgets every cookie the app holds, in Foundation's and WebKit's stores on
 * iOS and the shared store on Android: the Web Learning, registrar and SSO
 * sessions included, so nobody who uses the phone after a logout is still
 * signed in, whether or not the server heard the logout.
 */
export const clearSessionCookies = async () => {
  await CookieManager.clearAllStores();
};

/**
 * Signs in with `credential`, or with the saved login (through the helper's
 * provider) when there is none.
 */
export const loginWithFingerPrint = async (credential?: Credential) => {
  // A new login names its account; it may differ from the stored one.
  const isMock = isMockUser(credential?.username ?? getCredentials()?.username);
  sessionServer = isMock ? 'mock' : 'real';
  const source = isMock ? mockSource : helper;
  try {
    // thu-learn-lib clears the SSO cookies first (clearLoginCookies).
    await source.login(credential);
  } finally {
    noteSession(source.getCSRFToken());
  }
};

/**
 * Makes sure there's a session, with one request when the current one is
 * still good and a login with the saved credentials only when it has expired
 * (or none was opened in this JS runtime yet). Use it before work that isn't
 * a login, such as the background sync, a calendar sync or a download:
 * thu-learn-lib also logs in again by itself when a request finds the session
 * expired, so a full login there only costs another SSO round trip.
 */
export const ensureSession = async () => {
  await loadCredentials();
  await dataSource.ensureSession();
};

/**
 * The one thu-learn-lib helper in this JS runtime, so its logins never overlap
 * (it runs one at a time, and requests that find the session expired wait for
 * it) and it remembers a password the server turned down. It sends requests
 * with React Native's fetch, whose cookies live in the system's store, which
 * the web views, file downloads and the submission upload use too, and clears
 * the SSO cookies there before every login, the ones it starts by itself for
 * an expired session included.
 */
const helper = new Learn2018Helper({
  clearLoginCookies: () => clearLoginCookies(),
  // Android's download client has no cookie jar, so downloads carry the
  // Web Learning cookies in a header; iOS sends them from the shared store.
  cookieHeader: () => (isAndroid() ? learnCookieHeader() : undefined),
  provider: () => {
    const credentials = getCredentials();
    return {
      username: credentials?.username || undefined,
      password: credentials?.password || undefined,
      fingerPrint: credentials?.fingerPrint ?? '',
      fingerGenPrint: credentials?.fingerGenPrint ?? '',
      fingerGenPrint3: credentials?.fingerGenPrint3 ?? '',
    };
  },
});

/** The Web Learning cookies as a `Cookie` header. */
const learnCookieHeader = async () => {
  const cookies = await CookieManager.get(Urls.learn);
  return Object.values(cookies)
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ');
};
