import { FailReason } from '@robertying/thu-learn-lib';
import { getUserData, resetUserData } from 'data/userData';
import { showFavorite } from 'data/content';
import {
  flushServerActions,
  openNotice,
  setFavorite,
} from 'data/serverActions';
import { setServerWritesAllowed } from 'helpers/serverWrites';

const mockRemoveFromFavorites = jest.fn(() => Promise.resolve());
const mockAddToFavorites = jest.fn<Promise<void>, [unknown, string]>(() =>
  Promise.resolve(),
);
const mockMarkNoticeRead = jest.fn<Promise<void>, [string]>(() =>
  Promise.resolve(),
);

jest.mock('data/source', () => {
  const writes = jest.requireActual('helpers/serverWrites');
  return {
    dataSource: {
      addToFavorites: (type: unknown, id: string) =>
        mockAddToFavorites(type, id),
      removeFromFavorites: () => mockRemoveFromFavorites(),
      markNoticeRead: (url: string) => mockMarkNoticeRead(url),
    },
    serverWritesBlocked: () => !writes.getServerWritesAllowed(),
  };
});
jest.mock('data/auth', () => ({ getAuth: () => ({ loggedIn: true }) }));
jest.mock('data/content', () => ({
  markNoticeRead: jest.fn(),
  showFavorite: jest.fn(),
}));
jest.mock('data/credentials', () => ({ loadCredentials: jest.fn() }));

const settle = () => new Promise(resolve => setTimeout(resolve, 0));

beforeEach(() => {
  resetUserData();
  setServerWritesAllowed(false);
  mockRemoveFromFavorites.mockClear();
  mockAddToFavorites.mockReset();
  mockAddToFavorites.mockImplementation(() => Promise.resolve());
  mockMarkNoticeRead.mockReset();
  mockMarkNoticeRead.mockImplementation(() => Promise.resolve());
  jest.mocked(showFavorite).mockClear();
});

describe('server actions in a debug build', () => {
  it('holds a favorite change until writes are allowed, then sends it', async () => {
    setFavorite('notice', 'n1', false);
    await settle();
    expect(mockRemoveFromFavorites).not.toHaveBeenCalled();
    expect(getUserData().pendingActions).toHaveLength(1);

    setServerWritesAllowed(true);
    await settle();
    expect(mockRemoveFromFavorites).toHaveBeenCalledTimes(1);
    expect(getUserData().pendingActions).toHaveLength(0);
  });
});

describe('the queue', () => {
  beforeEach(() => setServerWritesAllowed(true));

  const rejected = { reason: FailReason.UNEXPECTED_STATUS, extra: 500 };
  const offline = { reason: FailReason.NETWORK_ERROR };

  it('shows a favorite at once, sends it and forgets it', async () => {
    setFavorite('file', 'f1', true);
    expect(showFavorite).toHaveBeenCalledWith('files', 'f1', true);
    await settle();
    expect(mockAddToFavorites).toHaveBeenCalledWith(expect.anything(), 'f1');
    expect(getUserData().pendingActions).toEqual([]);
  });

  it('keeps an action that did not reach the server, without counting it', async () => {
    mockMarkNoticeRead.mockRejectedValue(offline);
    openNotice('n1', 'https://learn.tsinghua.edu.cn/n1');
    await settle();
    await flushServerActions();
    expect(mockMarkNoticeRead).toHaveBeenCalledTimes(2);
    expect(getUserData().pendingActions).toMatchObject([
      { kind: 'noticeRead', id: 'n1', tries: 0 },
    ]);
  });

  it('keeps a notice read waiting while the session is expired', async () => {
    mockMarkNoticeRead.mockRejectedValue({ reason: FailReason.NOT_LOGGED_IN });
    openNotice('n1', 'https://learn.tsinghua.edu.cn/n1');
    await settle();
    expect(getUserData().pendingActions).toMatchObject([{ tries: 0 }]);
  });

  it('drops an action the server turns down three times and shows the item as it was', async () => {
    mockAddToFavorites.mockRejectedValue(rejected);
    setFavorite('notice', 'gone', true);
    await settle();
    expect(getUserData().pendingActions).toMatchObject([{ tries: 1 }]);
    await flushServerActions();
    expect(getUserData().pendingActions).toMatchObject([{ tries: 2 }]);
    expect(showFavorite).not.toHaveBeenCalledWith('notices', 'gone', false);

    await flushServerActions();
    expect(getUserData().pendingActions).toEqual([]);
    expect(showFavorite).toHaveBeenLastCalledWith('notices', 'gone', false);
  });

  it('sends an action queued while a flush runs in the same flush', async () => {
    let release: () => void = () => {};
    mockAddToFavorites.mockImplementationOnce(
      () => new Promise<void>(resolve => (release = resolve)),
    );
    setFavorite('assignment', 'a1', true);
    await settle();
    setFavorite('assignment', 'a2', true);
    await settle();
    expect(mockAddToFavorites).toHaveBeenCalledTimes(1);

    release();
    await settle();
    await settle();
    expect(mockAddToFavorites).toHaveBeenCalledTimes(2);
    expect(mockAddToFavorites).toHaveBeenLastCalledWith(
      expect.anything(),
      'a2',
    );
    expect(getUserData().pendingActions).toEqual([]);
  });

  it('sends only the last change to an item', async () => {
    setServerWritesAllowed(false);
    setFavorite('notice', 'n1', true);
    setFavorite('notice', 'n1', false);
    setServerWritesAllowed(true);
    await settle();
    expect(mockAddToFavorites).not.toHaveBeenCalled();
    expect(mockRemoveFromFavorites).toHaveBeenCalledTimes(1);
  });
});
