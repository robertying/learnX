import { accountStores, clearAccountData } from 'data/accountData';
import {
  setSetupSeen,
  setWelcomeSeen,
  setWhatsNewSeen,
  useAppStateStore,
} from 'data/appState';
import { getDataOwner, setDataOwner } from 'data/dataOwner';
import { userQuery } from 'data/queries';
import { queryClient } from 'data/queryClient';
import { defaultSettings, getSettings, setSetting } from 'data/settings';
import { getUserData, setArchived } from 'data/userData';
import { removeFileDir } from 'services/files/downloads';
import { clearSurfaces } from 'services/surfaces';

const { readdirSync, readFileSync } = jest.requireActual<{
  readdirSync: (dir: string) => string[];
  readFileSync: (file: string, encoding: 'utf8') => string;
}>('fs');
const path = jest.requireActual<{
  dirname: (file: string) => string;
  join: (...parts: string[]) => string;
}>('path');

jest.mock('data/source', () => ({
  dataSource: require('data/mockSource').mockSource,
}));
jest.mock('services/surfaces', () => ({
  clearSurfaces: jest.fn(async () => {}),
}));
jest.mock('services/files/downloads', () => ({
  removeFileDir: jest.fn(async () => {}),
}));

/** The storage keys of the `persist` stores in src/data. */
const persistedKeys = () => {
  // src/data, the folder above this test's.
  const dir = path.dirname(path.dirname(expect.getState().testPath!));
  return readdirSync(dir)
    .filter(file => file.endsWith('.ts'))
    .flatMap(file => {
      const source = readFileSync(path.join(dir, file), 'utf8');
      if (!source.includes('persist(')) {
        return [];
      }
      const name = /persist\([\s\S]*?name: (\w+)/.exec(source)?.[1];
      const value = name
        ? new RegExp(`export const ${name} = '([^']+)'`).exec(source)?.[1]
        : undefined;
      return [value ?? `${file}: unknown key`];
    });
};

it('lists every persisted store, so logging out empties it', () => {
  const keys = persistedKeys();
  expect(keys.length).toBeGreaterThan(0);
  expect(Object.keys(accountStores).sort()).toEqual(keys.sort());
});

describe('clearAccountData', () => {
  it("empties the account's data and keeps what belongs to the install", async () => {
    setSetting('graduate', true);
    setArchived('notice', ['n1'], true);
    setWelcomeSeen();
    setSetupSeen();
    setWhatsNewSeen('19.0.0');
    setDataOwner('2020000000');
    queryClient.setQueryData(userQuery.queryKey, { name: 'A' } as never);

    await clearAccountData();

    expect(getSettings()).toEqual(defaultSettings);
    expect(getUserData().archived.notice).toEqual([]);
    expect(useAppStateStore.getState()).toMatchObject({
      welcomeSeen: true,
      setupSeen: false,
      whatsNewSeenVersion: '19.0.0',
    });
    expect(getDataOwner()).toBeNull();
    expect(queryClient.getQueryData(userQuery.queryKey)).toBeUndefined();
    expect(clearSurfaces).toHaveBeenCalled();
    expect(removeFileDir).toHaveBeenCalled();
  });

  it("starts from the given user data, e.g. the mock account's", async () => {
    const mine = { ...getUserData(), hiddenCourses: ['c1'] };
    await clearAccountData(mine);
    expect(getUserData().hiddenCourses).toEqual(['c1']);
  });

  it('resolves even when the files cannot be deleted', async () => {
    jest.mocked(removeFileDir).mockRejectedValueOnce(new Error('busy'));
    await expect(clearAccountData()).resolves.toBeUndefined();
  });
});
