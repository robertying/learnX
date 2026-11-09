import { Platform } from 'react-native';
import { Learn2018Helper, addCSRFTokenToUrl } from '@robertying/thu-learn-lib';
import mime from 'mime';
import axios from 'axios';
import CookieManager from '@preeternal/react-native-cookie-manager';
import { getCredentials } from 'data/credentials';
import {
  getMockNetworkConfig,
  mockDownloadFile,
  mockSource,
  mockSubmitAssignment,
} from 'data/mockSource';
import Urls from 'constants/Urls';
import { isMockUser } from 'helpers/mock';
import { assertServerWritesAllowed } from 'helpers/serverWrites';

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
>;

let helper: Learn2018Helper;

const isMockSession = () => isMockUser(getCredentials()?.username);

/**
 * Talks to learn.tsinghua.edu.cn, or to the emulated server in
 * `data/mockSource` while a mock account is logged in. Picked per call, so
 * logging in or out switches it.
 */
export const dataSource = new Proxy({} as DataSource, {
  get: (_, key: keyof DataSource) => {
    const source: DataSource = isMockSession() ? mockSource : helper;
    const value = source[key];
    return typeof value === 'function' ? value.bind(source) : value;
  },
});

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

export const loginWithFingerPrint = async (
  username?: string,
  password?: string,
  fingerPrint?: string,
  fingerGenPrint?: string,
  fingerGenPrint3?: string,
) => {
  // A new login names its account; it may differ from the stored one.
  const isMock = isMockUser(username ?? getCredentials()?.username);
  if (!isMock) {
    await clearLoginCookies();
  }
  await (isMock ? mockSource : helper).login(
    username,
    password,
    fingerPrint,
    fingerGenPrint,
    fingerGenPrint3,
  );
};

const REACHABILITY_TIMEOUT_MS = 8 * 1000;

/**
 * Whether the school's login server answers at all, to tell a device without
 * a connection from a login the server turned down. Any HTTP answer counts.
 * The mock accounts ask the network emulation instead.
 */
export const isServerReachable = async () => {
  if (isMockSession()) {
    const { failure } = getMockNetworkConfig();
    return failure !== 'offline' && failure !== 'timeout';
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REACHABILITY_TIMEOUT_MS);
  try {
    await fetch(Urls.id, { method: 'HEAD', signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
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

export const addCSRF = (url: string) => {
  if (new URL(url).hostname?.endsWith('tsinghua.edu.cn')) {
    return addCSRFTokenToUrl(url, dataSource.getCSRFToken());
  }
  return url;
};

/**
 * Applies Settings › Network Emulation to a file download while a mock
 * account is logged in; does nothing otherwise.
 */
export const emulateFileDownload = async () => {
  if (isMockSession()) {
    await mockDownloadFile();
  }
};

const submitAssignmentUrl = `${Urls.learn}/b/wlxt/kczy/zy/student/tjzy`;

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

  if (isMockSession()) {
    await mockSubmitAssignment(onProgress);
    return;
  }

  assertServerWritesAllowed('Assignment submission');

  const body = new FormData();
  body.append('xszyid', studentHomeworkId);
  body.append('zynr', content || '');
  body.append('isDeleted', remove ? '1' : '0');
  if (attachment) {
    body.append('fileupload', {
      uri: attachment.uri,
      name: attachment.name,
      type: mime.getType(attachment.uri) || 'application/octet-stream',
    } as any);
  } else {
    // what the website sends without a file: it appends `files[0]`, undefined
    body.append('fileupload', 'undefined');
  }

  try {
    await loginWithFingerPrint();
  } catch {
    throw new Error('Failed to submit the assignment: login failed');
  }

  const url = addCSRF(submitAssignmentUrl);
  const res = await axios.post(url, body, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: e => {
      // New architecture doesn't like native floats
      onProgress?.(parseFloat((e.total ? e.loaded / e.total : 0).toFixed(2)));
    },
  });

  // An expired session gets a 200 with an HTML page that redirects to the
  // login page, so only an explicit success counts.
  const result: unknown = res.data?.result;
  if (result !== 'success') {
    const msg: unknown = res.data?.msg;
    throw new Error(
      result === 'error' && typeof msg === 'string' && msg
        ? 'Failed to submit the assignment: ' + msg
        : 'Failed to submit the assignment: invalid login session',
    );
  }
};
