import { Platform } from 'react-native';
import {
  Learn2018Helper,
  checkHomeworkSubmitResponse,
  type ApiError,
  type Credential,
  FailReason,
} from '@robertying/thu-learn-lib';
import mime from 'mime';
import axios from 'axios';
import CookieManager from '@preeternal/react-native-cookie-manager';
import { getCredentials, loadCredentials } from 'data/credentials';
import { mockSource } from 'data/mockSource';
import Urls from 'constants/Urls';
import { addCSRFTokenToLearnUrl } from 'helpers/learnUrl';
import { isMockUser } from 'helpers/mock';
import {
  assertServerWritesAllowed,
  getServerWritesAllowed,
} from 'helpers/serverWrites';

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
  | 'getNotificationAttachment'
  | 'getHomeworkList'
  | 'getHomeworkDetail'
  | 'getExcellentHomeworkDetail'
  | 'getFileList'
  | 'getCalendar'
  | 'addToFavorites'
  | 'removeFromFavorites'
  | 'getFavorites'
>;

/**
 * Everything the app asks of the school's server: thu-learn-lib's calls, and
 * the few requests the app sends itself.
 */
export interface AppSource extends DataSource {
  /**
   * Loads a notice's page, which marks the notice read on the server, as the
   * website does when it's opened.
   */
  markNoticeRead: (url: string) => Promise<void>;
  /** See `submitAssignment` below. */
  submitAssignment: (
    studentHomeworkId: string,
    content: string | undefined,
    attachment: { uri: string; name: string } | undefined,
    onProgress: ((progress: number) => void) | undefined,
    remove: boolean,
  ) => Promise<void>;
  /** Runs before a file is downloaded from the server. */
  prepareFileDownload: () => Promise<void>;
}

let helper: Learn2018Helper;

const isMockSession = () => isMockUser(getCredentials()?.username);

/** The requests the app sends to learn.tsinghua.edu.cn itself. */
const realRequests: Omit<AppSource, keyof DataSource> = {
  markNoticeRead: async url => {
    const response = await fetch(url);
    if (!response.ok) {
      throw {
        reason: FailReason.UNEXPECTED_STATUS,
        extra: response.status,
      } satisfies ApiError;
    }
  },
  submitAssignment: async (
    studentHomeworkId,
    content,
    attachment,
    onProgress,
    remove,
  ) => {
    assertServerWritesAllowed('Assignment submission');

    // Checks the session first, logging in again only if it has expired.
    const { url, body } = await helper.getHomeworkSubmitRequest(
      studentHomeworkId,
      content,
      attachment && {
        filename: attachment.name,
        content: {
          uri: attachment.uri,
          type: mime.getType(attachment.uri) || 'application/octet-stream',
        },
      },
      remove,
    );
    const res = await axios.post<string>(url, body, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // Read as text: an expired session answers with the login page.
      responseType: 'text',
      transformResponse: data => data,
      onUploadProgress: e => {
        // New architecture doesn't like native floats
        onProgress?.(parseFloat((e.total ? e.loaded / e.total : 0).toFixed(2)));
      },
    });
    checkHomeworkSubmitResponse(res.data);
  },
  prepareFileDownload: async () => {},
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
 * `data/mockSource` while a mock account is logged in. Picked per call, so
 * logging in or out switches it; nothing else in the app checks for the mock
 * account to pick a server.
 */
export const dataSource = new Proxy({} as AppSource, {
  get: (_, key: keyof AppSource) => {
    const source: AppSource = isMockSession() ? mockSource : realSource;
    const value = source[key];
    return typeof value === 'function' ? value.bind(source) : value;
  },
});

/**
 * Whether changes to the account stay on the phone for now: a debug build
 * with a real account, until "Allow Server Writes" is on in Settings.
 */
export const serverWritesBlocked = () =>
  !isMockSession() && !getServerWritesAllowed();

export const clearLoginCookies = async () => {
  if (Platform.OS === 'ios') {
    await CookieManager.clearByName(Urls.id, 'JSESSIONID');
  } else {
    await CookieManager.setFromResponse(
      Urls.id,
      'JSESSIONID=; path=/; HttpOnly',
    );
    await CookieManager.flush();
  }
};

/**
 * Signs in with `credential`, or with the saved login (through the helper's
 * provider) when there is none.
 */
export const loginWithFingerPrint = async (credential?: Credential) => {
  // A new login names its account; it may differ from the stored one.
  const isMock = isMockUser(credential?.username ?? getCredentials()?.username);
  if (!isMock) {
    await clearLoginCookies();
  }
  await (isMock ? mockSource : helper).login(credential);
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

export const resetDataSource = () => {
  helper = new Learn2018Helper({
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
};
resetDataSource();

export const addCSRF = (url: string) =>
  addCSRFTokenToLearnUrl(url, dataSource.getCSRFToken());

/**
 * Submits an assignment: `content` is the whole answer as HTML, which replaces
 * the submitted one; `remove` deletes the attachment. Sent with axios, which
 * reports upload progress (thu-learn-lib's fetch can't).
 */
export const submitAssignment = async (
  studentHomeworkId: string,
  content?: string,
  attachment?: {
    uri: string;
    name: string;
  },
  onProgress?: (progress: number) => void,
  remove: boolean = false,
) => {
  if (!content && !attachment && !remove) {
    return;
  }
  await dataSource.submitAssignment(
    studentHomeworkId,
    content,
    attachment,
    onProgress,
    remove,
  );
};
