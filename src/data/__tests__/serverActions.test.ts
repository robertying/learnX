import { getUserData, resetUserData } from 'data/userData';
import { setFavorite } from 'data/serverActions';
import { setServerWritesAllowed } from 'helpers/serverWrites';

const mockRemoveFromFavorites = jest.fn(() => Promise.resolve());

jest.mock('data/source', () => {
  const writes = jest.requireActual('helpers/serverWrites');
  return {
    dataSource: {
      addToFavorites: jest.fn(() => Promise.resolve()),
      removeFromFavorites: () => mockRemoveFromFavorites(),
      markNoticeRead: jest.fn(() => Promise.resolve()),
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
