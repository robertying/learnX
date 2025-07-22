import { Platform } from 'react-native';
import { Learn2018Helper, addCSRFTokenToUrl } from 'thu-learn-lib';
import mime from 'mime-types';
import axios from 'axios';
import CookieManager from '@react-native-cookies/cookies';
import { store } from 'data/store';
import Urls from 'constants/Urls';

export let dataSource: Learn2018Helper;

export const clearLoginCookies = async () => {
  if (Platform.OS === 'ios') {
    await CookieManager.set(Urls.id, {
      httpOnly: true,
      name: 'JSESSIONID',
      path: '/',
      value: '',
    });
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
  await clearLoginCookies();
  await dataSource.login(
    username,
    password,
    fingerPrint,
    fingerGenPrint,
    fingerGenPrint3,
  );
};

export const resetDataSource = () => {
  dataSource = new Learn2018Helper({
    provider: () => {
      const state = store.getState();
      return {
        username: state.auth.username || undefined,
        password: state.auth.password || undefined,
        fingerPrint: state.auth.fingerPrint || '',
        fingerGenPrint: state.auth.fingerGenPrint || '',
        fingerGenPrint3: state.auth.fingerGenPrint3 || '',
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

  const body = new FormData();
  body.append('xszyid', studentHomeworkId);
  body.append('zynr', content || '');
  body.append('isDeleted', remove ? '1' : '0');
  if (attachment) {
    body.append('fileupload', {
      uri: attachment.uri,
      name: attachment.name,
      type: mime.lookup(attachment.uri) || 'application/octet-stream',
    } as any);
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

  if (res.status !== 200) {
    throw new Error('Failed to submit the assignment: invalid login session');
  }
  if (res.data?.result === 'error') {
    throw new Error('Failed to submit the assignment: ' + res.data?.msg);
  }
};
