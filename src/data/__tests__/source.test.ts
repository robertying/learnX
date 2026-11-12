import { Platform } from 'react-native';
import axios from 'axios';
import CookieManager from '@preeternal/react-native-cookie-manager';
import { FailReason } from '@robertying/thu-learn-lib';
import { getAuth, initialAuth, useAuthStore } from 'data/auth';
import { useCredentialsStore } from 'data/credentials';
import { mockSource } from 'data/mockSource';
import {
  addCSRF,
  clearSessionCookies,
  dataSource,
  endSession,
  ensureSession,
  loginWithFingerPrint,
  serverWritesBlocked,
} from 'data/source';
import { setServerWritesAllowed } from 'helpers/serverWrites';

jest.mock('axios', () => ({ post: jest.fn() }));
jest.mock('@preeternal/react-native-cookie-manager', () => ({
  get: jest.fn(() => Promise.resolve({})),
  clearByName: jest.fn(),
  setFromResponse: jest.fn(),
  flush: jest.fn(),
  clearAllStores: jest.fn(() => Promise.resolve(true)),
}));
const mockEnsureSession = jest.fn(() => Promise.resolve());
const mockLogin = jest.fn<Promise<void>, [credential?: unknown]>(() =>
  Promise.resolve(),
);
const mockMarkNotificationRead = jest.fn<Promise<void>, [unknown]>(() =>
  Promise.resolve(),
);
type HelperConfig = {
  provider: () => unknown;
  clearLoginCookies: () => Promise<void>;
};
const mockGetSubmitRequest = jest.fn(
  async (
    id: string,
    {
      content,
      attachment,
      removeAttachment: remove,
    }: {
      content?: string;
      attachment?: { filename: string };
      removeAttachment?: boolean;
    } = {},
  ) => {
    const body = new FormData();
    body.append('xszyid', id);
    body.append('zynr', content ?? '');
    body.append('fileupload', attachment ? attachment.filename : 'undefined');
    body.append('isDeleted', remove ? '1' : '0');
    return { url: 'https://learn.tsinghua.edu.cn/submit?_csrf=token', body };
  },
);
jest.mock('@robertying/thu-learn-lib', () => ({
  ...jest.requireActual('@robertying/thu-learn-lib'),
  Learn2018Helper: class Helper {
    // Kept on the class: the helper is made when data/source loads, before
    // this file's variables exist.
    static config: HelperConfig;
    constructor(config: HelperConfig) {
      Helper.config = config;
    }
    getCSRFToken = () => 'token';
    login = (credential?: unknown) => mockLogin(credential);
    ensureSession = () => mockEnsureSession();
    markNotificationRead = (notification: unknown) =>
      mockMarkNotificationRead(notification);
    // These call this file's consts only once a test runs.
    getHomeworkSubmitRequest = (
      ...args: Parameters<typeof mockGetSubmitRequest>
    ) => mockGetSubmitRequest(...args);
  },
}));

const post = jest.mocked(axios.post);
const helperConfig = () =>
  jest.requireMock<{ Learn2018Helper: { config: HelperConfig } }>(
    '@robertying/thu-learn-lib',
  ).Learn2018Helper.config;

const submit = () =>
  dataSource.submitAssignment('homework-id', { content: 'content' });

describe('submitAssignment', () => {
  beforeEach(() => setServerWritesAllowed(true));
  afterEach(() => setServerWritesAllowed(false));

  it('is blocked in debug builds until server writes are allowed', async () => {
    setServerWritesAllowed(false);
    await expect(submit()).rejects.toThrow('Allow Server Writes');
    expect(post).not.toHaveBeenCalled();
  });

  it("sends thu-learn-lib's request, with the file as React Native uploads it", async () => {
    post.mockResolvedValueOnce({ status: 200, data: '{"result":"success"}' });
    await dataSource.submitAssignment('homework-id', {
      content: '<p>answer</p>',
      attachment: { uri: 'file:///tmp/answer.pdf', name: 'Answer.pdf' },
    });
    expect(mockGetSubmitRequest).toHaveBeenLastCalledWith('homework-id', {
      content: '<p>answer</p>',
      attachment: {
        filename: 'Answer.pdf',
        content: { uri: 'file:///tmp/answer.pdf', type: 'application/pdf' },
      },
      removeAttachment: false,
    });
    expect(post.mock.calls[0][1]).toBe(
      (await mockGetSubmitRequest.mock.results[0].value).body,
    );
  });

  it('resolves when the server says it succeeded', async () => {
    post.mockResolvedValueOnce({ status: 200, data: '{"result":"success"}' });
    await expect(submit()).resolves.toBeUndefined();
    expect(post).toHaveBeenCalledWith(
      expect.stringContaining('_csrf=token'),
      expect.any(FormData),
      expect.anything(),
    );
  });

  it('fails on the login redirect page an expired session gets', async () => {
    post.mockResolvedValueOnce({
      status: 200,
      data: '<html><body><p>您未登录或登录失效</p></body></html>',
    });
    await expect(submit()).rejects.toMatchObject({
      reason: FailReason.NOT_LOGGED_IN,
    });
  });

  it('fails with the server message on an error result', async () => {
    post.mockResolvedValueOnce({
      status: 200,
      data: '{"result":"error","msg":"deadline passed"}',
    });
    await expect(submit()).rejects.toMatchObject({
      reason: FailReason.OPERATION_FAILED,
    });
  });

  it('reports upload progress rounded, keeping the response text as is', async () => {
    post.mockResolvedValueOnce({ status: 200, data: '{"result":"success"}' });
    const onProgress = jest.fn();
    await dataSource.submitAssignment('homework-id', {
      content: 'a',
      onProgress,
    });
    const config = post.mock.calls[0][2] as {
      onUploadProgress: (e: { loaded: number; total?: number }) => void;
      transformResponse: (data: string) => string;
    };
    config.onUploadProgress({ loaded: 1, total: 3 });
    config.onUploadProgress({ loaded: 5 });
    expect(onProgress.mock.calls).toEqual([[0.33], [0]]);
    expect(config.transformResponse('{"a":1}')).toBe('{"a":1}');
  });
});

describe('markNoticeRead', () => {
  const url =
    'https://learn.tsinghua.edu.cn/f/wlxt/kcgg/wlkc_ggb/student/beforeViewXs?wlkcid=c&id=n';

  beforeEach(() => mockMarkNotificationRead.mockClear());

  it("loads a Web Learning notice page through thu-learn-lib's session", async () => {
    await dataSource.markNoticeRead(url);
    expect(mockMarkNotificationRead).toHaveBeenCalledWith({ url });
  });

  it('does not load a page outside Web Learning', async () => {
    await dataSource.markNoticeRead('https://example.com/notice');
    expect(mockMarkNotificationRead).not.toHaveBeenCalled();
  });
});

describe('picking the server', () => {
  const credentials = (username: string) =>
    useCredentialsStore.setState({
      credentials: {
        username,
        password: 'password',
        fingerPrint: 'fp',
        fingerGenPrint: 'g',
        fingerGenPrint3: 'g3',
      },
    });

  afterEach(() => {
    useCredentialsStore.setState({ credentials: null });
    endSession();
  });

  it('keeps to the server a login started with, whatever login is saved', async () => {
    credentials('2020000000');
    const login = jest.spyOn(mockSource, 'login');
    await loginWithFingerPrint({ username: 'mock-user', password: 'p' });
    expect(login).toHaveBeenCalled();
    // The mock login isn't saved yet; the session is still the mock one's.
    expect(dataSource.getCSRFToken()).toBe(mockSource.getCSRFToken());
    expect(serverWritesBlocked()).toBe(false);

    // After logout, the saved login decides again.
    endSession();
    expect(dataSource.getCSRFToken()).toBe('token');
    login.mockRestore();
  });

  it('talks to the emulated server while a mock account is logged in', async () => {
    credentials('mock-user');
    const login = jest.spyOn(mockSource, 'login');
    expect(dataSource.getCSRFToken()).toBe(mockSource.getCSRFToken());
    expect(serverWritesBlocked()).toBe(false);

    await loginWithFingerPrint();
    expect(login).toHaveBeenCalled();
    expect(mockLogin).not.toHaveBeenCalled();
    expect(CookieManager.get).not.toHaveBeenCalled();
    login.mockRestore();
  });

  it('talks to Web Learning otherwise, keeping writes back in debug builds', () => {
    credentials('2020000000');
    expect(dataSource.getCSRFToken()).toBe('token');
    expect(serverWritesBlocked()).toBe(true);
    setServerWritesAllowed(true);
    expect(serverWritesBlocked()).toBe(false);
    setServerWritesAllowed(false);
  });

  it('picks by the account a new login names, not the stored one', async () => {
    credentials('mock-user');
    const credential = { username: '2020000000', password: 'p' };
    await loginWithFingerPrint(credential);
    expect(mockLogin).toHaveBeenCalledWith(credential);
  });

  it("has thu-learn-lib clear the SSO page's id.tsinghua.edu.cn cookies from both iOS stores", async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    jest
      .mocked(CookieManager.get)
      .mockImplementation((_url, options) =>
        Promise.resolve(
          (options as unknown as { iosCookieStore?: string })
            ?.iosCookieStore === 'webKit'
            ? ({ JSESSIONID: {}, singleLogin: {} } as never)
            : ({ JSESSIONID: {} } as never),
        ),
      );
    await helperConfig().clearLoginCookies();
    const cleared = jest
      .mocked(CookieManager.clearByName)
      .mock.calls.map(([, name, options]) => [
        name,
        (options as unknown as { iosCookieStore: string }).iosCookieStore,
      ]);
    expect(cleared).toEqual(
      expect.arrayContaining([
        ['JSESSIONID', 'foundation'],
        ['JSESSIONID', 'webKit'],
        ['singleLogin', 'webKit'],
      ]),
    );
    expect(cleared).toHaveLength(3);
    jest
      .mocked(CookieManager.get)
      .mockImplementation(() => Promise.resolve({}));
  });

  it('empties the SSO cookies by hand on Android', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest
      .mocked(CookieManager.get)
      .mockResolvedValueOnce({ singleLogin: {} } as never);
    await helperConfig().clearLoginCookies();
    expect(CookieManager.setFromResponse).toHaveBeenCalledWith(
      'https://id.tsinghua.edu.cn',
      'JSESSIONID=; path=/; HttpOnly',
    );
    expect(CookieManager.setFromResponse).toHaveBeenCalledWith(
      'https://id.tsinghua.edu.cn',
      'singleLogin=; path=/; HttpOnly',
    );
    expect(CookieManager.flush).toHaveBeenCalled();
  });

  it('clears every cookie in every store on logout', async () => {
    await clearSessionCookies();
    expect(CookieManager.clearAllStores).toHaveBeenCalledTimes(1);
  });

  it('loads the saved login before making sure of a session', async () => {
    await ensureSession();
    expect(mockEnsureSession).toHaveBeenCalledTimes(1);
  });

  it("hands thu-learn-lib the saved login, blanks for what's missing", () => {
    const provider = helperConfig().provider;
    expect(provider()).toEqual({
      username: undefined,
      password: undefined,
      fingerPrint: '',
      fingerGenPrint: '',
      fingerGenPrint3: '',
    });
    credentials('2020000000');
    expect(provider()).toEqual({
      username: '2020000000',
      password: 'password',
      fingerPrint: 'fp',
      fingerGenPrint: 'g',
      fingerGenPrint3: 'g3',
    });
  });

  it('adds the CSRF token to Web Learning links only', () => {
    expect(
      addCSRF(
        'https://learn.tsinghua.edu.cn/b/wlxt/kj/wlkc_kjxxb/student/downloadFile?sfgk=0&wjid=1',
      ),
    ).toContain('_csrf=token');
    expect(addCSRF('https://example.com/a')).toBe('https://example.com/a');
  });
});

describe('failed requests', () => {
  beforeEach(() => {
    useCredentialsStore.setState({
      credentials: {
        username: 'mock-user',
        password: 'p',
        fingerPrint: 'fp',
        fingerGenPrint: '',
        fingerGenPrint3: '',
      },
    });
    useAuthStore.setState({ ...initialAuth, loggedIn: true });
  });
  afterEach(() => {
    useCredentialsStore.setState({ credentials: null });
    useAuthStore.setState(initialAuth);
    jest.restoreAllMocks();
  });

  it('end the session when any call finds the password was turned down', async () => {
    const error = { reason: FailReason.BAD_CREDENTIAL };
    jest.spyOn(mockSource, 'addToFavorites').mockRejectedValue(error);

    await expect(
      dataSource.addToFavorites('notification' as never, 'n1'),
    ).rejects.toBe(error);
    expect(getAuth()).toMatchObject({ loggedIn: false, failure: 'rejected' });
  });

  it('leave the session alone for other errors and pass results through', async () => {
    jest
      .spyOn(mockSource, 'removeFromFavorites')
      .mockRejectedValue({ reason: FailReason.UNEXPECTED_STATUS });
    await expect(dataSource.removeFromFavorites('n1')).rejects.toMatchObject({
      reason: FailReason.UNEXPECTED_STATUS,
    });
    expect(getAuth().loggedIn).toBe(true);
    expect(dataSource.getCSRFToken()).toBe(mockSource.getCSRFToken());
  });
});
