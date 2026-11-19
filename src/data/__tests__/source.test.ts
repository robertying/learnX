import { Platform } from 'react-native';
import CookieManager from '@preeternal/react-native-cookie-manager';
import { FailReason } from '@robertying/thu-learn-lib';
import { getAuth, initialAuth, useAuthStore } from 'data/auth';
import { useCredentialsStore } from 'data/credentials';
import { mockSource } from 'data/mockSource';
import {
  clearSessionCookies,
  dataSource,
  endSession,
  ensureSession,
  loginWithFingerPrint,
  serverWritesBlocked,
} from 'data/source';
import { setServerWritesAllowed } from 'helpers/serverWrites';

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
  cookieHeader: (url: string) => Promise<string | undefined> | undefined;
};
const mockSubmitHomework = jest.fn<
  Promise<void>,
  [string, { onProgress?: (progress: number) => void }]
>(() => Promise.resolve());
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
    // These call this file's consts only once a test runs.
    markNotificationRead = (notification: unknown) =>
      mockMarkNotificationRead(notification);
    submitHomework = (...args: Parameters<typeof mockSubmitHomework>) =>
      mockSubmitHomework(...args);
  },
}));

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
    expect(mockSubmitHomework).not.toHaveBeenCalled();
  });

  it('submits through thu-learn-lib, with the file as React Native uploads it', async () => {
    await dataSource.submitAssignment('homework-id', {
      content: '<p>answer</p>',
      attachment: { uri: 'file:///tmp/answer.pdf', name: 'Answer.pdf' },
      remove: true,
    });
    expect(mockSubmitHomework).toHaveBeenCalledWith('homework-id', {
      content: '<p>answer</p>',
      attachment: {
        filename: 'Answer.pdf',
        content: { uri: 'file:///tmp/answer.pdf', type: 'application/pdf' },
      },
      removeAttachment: true,
      onProgress: undefined,
    });
  });

  it('sends a file of unknown type as bytes, and nothing without one', async () => {
    await dataSource.submitAssignment('homework-id', {
      attachment: { uri: 'file:///tmp/answer', name: 'answer' },
    });
    await submit();
    expect(mockSubmitHomework.mock.calls.map(([, options]) => options)).toEqual(
      [
        expect.objectContaining({
          attachment: {
            filename: 'answer',
            content: {
              uri: 'file:///tmp/answer',
              type: 'application/octet-stream',
            },
          },
          removeAttachment: false,
        }),
        expect.objectContaining({ attachment: undefined }),
      ],
    );
  });

  it('passes on what thu-learn-lib rejects with', async () => {
    const failure = { reason: FailReason.OPERATION_FAILED };
    mockSubmitHomework.mockRejectedValueOnce(failure);
    await expect(submit()).rejects.toBe(failure);
  });

  it("sends the file's bytes in the Electron app, without progress", async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    jest.doMock('expo-file-system', () => ({
      File: class {
        constructor(readonly uri: string) {}
        bytes = async () => new Uint8Array([1, 2, 3]);
      },
    }));
    const onProgress = jest.fn();
    await dataSource.submitAssignment('homework-id', {
      attachment: { uri: 'file:///c/picked/a/Answer.pdf', name: 'Answer.pdf' },
      onProgress,
    });
    const [, options] = mockSubmitHomework.mock.calls[0] as unknown as [
      string,
      { attachment: { content: Blob }; onProgress?: unknown },
    ];
    expect(options.attachment.content).toBeInstanceOf(Blob);
    expect(options.attachment.content.type).toBe('application/pdf');
    expect(options.attachment.content.size).toBe(3);
    expect(options.onProgress).toBeUndefined();
    jest.dontMock('expo-file-system');
  });

  it('reports upload progress rounded to two decimals', async () => {
    const onProgress = jest.fn();
    await dataSource.submitAssignment('homework-id', {
      content: 'a',
      onProgress,
    });
    mockSubmitHomework.mock.calls[0][1].onProgress?.(1 / 3);
    expect(onProgress).toHaveBeenCalledWith(0.33);
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

  it("removes the SSO cookies from the Electron app's session", async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    jest
      .mocked(CookieManager.get)
      .mockResolvedValueOnce({ JSESSIONID: {}, singleLogin: {} } as never);
    await helperConfig().clearLoginCookies();
    expect(
      jest.mocked(CookieManager.clearByName).mock.calls.map(call => call[1]),
    ).toEqual(['JSESSIONID', 'singleLogin']);
    expect(CookieManager.setFromResponse).not.toHaveBeenCalled();
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

  it('gives downloads the Web Learning cookies on Android only', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    expect(helperConfig().cookieHeader('https://learn.tsinghua.edu.cn/a')).toBe(
      undefined,
    );
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.mocked(CookieManager.get).mockResolvedValueOnce({
      a: { name: 'JSESSIONID', value: 'session' },
      b: { name: 'XSRF-TOKEN', value: 'token' },
    } as never);
    await expect(
      helperConfig().cookieHeader('https://learn.tsinghua.edu.cn/a'),
    ).resolves.toBe('JSESSIONID=session; XSRF-TOKEN=token');
    expect(CookieManager.get).toHaveBeenCalledWith(
      'https://learn.tsinghua.edu.cn',
    );
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

describe('the session token', () => {
  beforeEach(() => {
    useCredentialsStore.setState({
      credentials: {
        username: '2020000000',
        password: 'p',
        fingerPrint: 'fp',
        fingerGenPrint: '',
        fingerGenPrint3: '',
      },
    });
  });
  afterEach(() => {
    useCredentialsStore.setState({ credentials: null });
    useAuthStore.setState(initialAuth);
    endSession();
  });

  it('is noted once a login settles, failed or not', async () => {
    await loginWithFingerPrint();
    expect(getAuth().sessionToken).toBe('token');

    useAuthStore.setState(initialAuth);
    mockLogin.mockRejectedValueOnce(new Error('offline'));
    await expect(loginWithFingerPrint()).rejects.toThrow('offline');
    expect(getAuth().sessionToken).toBe('token');
  });

  it("is noted after every call, catching thu-learn-lib's own logins", async () => {
    await dataSource.ensureSession();
    expect(getAuth().sessionToken).toBe('token');

    useAuthStore.setState(initialAuth);
    mockMarkNotificationRead.mockRejectedValueOnce(new Error('offline'));
    await expect(
      dataSource.markNoticeRead('https://learn.tsinghua.edu.cn/n'),
    ).rejects.toThrow('offline');
    expect(getAuth().sessionToken).toBe('token');
  });
});

it("isn't taken for a promise, having no then", async () => {
  await expect(Promise.resolve(dataSource)).resolves.toBe(dataSource);
});
