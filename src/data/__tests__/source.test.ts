import axios from 'axios';
import { FailReason } from '@robertying/thu-learn-lib';
import { dataSource, submitAssignment } from 'data/source';
import { setServerWritesAllowed } from 'helpers/serverWrites';

jest.mock('axios', () => ({ post: jest.fn() }));
jest.mock('@preeternal/react-native-cookie-manager', () => ({
  clearByName: jest.fn(),
  setFromResponse: jest.fn(),
  flush: jest.fn(),
}));
const mockEnsureSession = jest.fn(() => Promise.resolve());
const mockGetSubmitRequest = jest.fn(
  async (
    id: string,
    content?: string,
    attachment?: { filename: string },
    remove?: boolean,
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
  Learn2018Helper: class {
    getCSRFToken = () => 'token';
    ensureSession = () => mockEnsureSession();
    // the helper is made when data/source loads, before this file's consts
    getHomeworkSubmitRequest = (
      ...args: Parameters<typeof mockGetSubmitRequest>
    ) => mockGetSubmitRequest(...args);
  },
}));

const post = jest.mocked(axios.post);

const submit = () => submitAssignment('homework-id', { content: 'content' });

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
    await submitAssignment('homework-id', {
      content: '<p>answer</p>',
      attachment: { uri: 'file:///tmp/answer.pdf', name: 'Answer.pdf' },
    });
    expect(mockGetSubmitRequest).toHaveBeenLastCalledWith(
      'homework-id',
      '<p>answer</p>',
      {
        filename: 'Answer.pdf',
        content: { uri: 'file:///tmp/answer.pdf', type: 'application/pdf' },
      },
      false,
    );
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

  it('does not call the server with nothing to submit', async () => {
    post.mockClear();
    await submitAssignment('homework-id', {});
    expect(post).not.toHaveBeenCalled();
  });
});

describe('markNoticeRead', () => {
  const url =
    'https://learn.tsinghua.edu.cn/f/wlxt/kcgg/wlkc_ggb/student/beforeViewXs?wlkcid=c&id=n';
  const notice = `<html>${'notice '.repeat(1000)}</html>`;
  const loginPage = '<html><title>登录超时</title></html>';
  const page = (text: string, init: { status?: number; url?: string } = {}) => {
    const response = new Response(text, { status: init.status ?? 200 });
    Object.defineProperty(response, 'url', { value: init.url ?? url });
    return response;
  };
  const fetchMock = jest.fn<Promise<Response>, [string]>();

  beforeEach(() => {
    fetchMock.mockReset();
    mockEnsureSession.mockClear();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  it('loads the notice page once when the session is good', async () => {
    fetchMock.mockResolvedValue(page(notice));
    await dataSource.markNoticeRead(url);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockEnsureSession).not.toHaveBeenCalled();
  });

  it('logs in again and loads it once more when it gets the login page', async () => {
    fetchMock
      .mockResolvedValueOnce(page(loginPage))
      .mockResolvedValueOnce(page(notice));
    await dataSource.markNoticeRead(url);
    expect(mockEnsureSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('treats a redirect to the login timeout page as an expired session', async () => {
    fetchMock.mockResolvedValue(
      page('', { url: 'https://learn.tsinghua.edu.cn/f/login_timeout' }),
    );
    await expect(dataSource.markNoticeRead(url)).rejects.toMatchObject({
      reason: FailReason.NOT_LOGGED_IN,
    });
    expect(mockEnsureSession).toHaveBeenCalledTimes(1);
  });

  it('fails with the status of an error page', async () => {
    fetchMock.mockResolvedValue(page('', { status: 500 }));
    await expect(dataSource.markNoticeRead(url)).rejects.toMatchObject({
      reason: FailReason.UNEXPECTED_STATUS,
      extra: 500,
    });
  });

  it('does not load a page outside Web Learning', async () => {
    await dataSource.markNoticeRead('https://example.com/notice');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
