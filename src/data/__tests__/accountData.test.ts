import { accountStores } from 'data/accountData';

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
jest.mock('helpers/surfaces', () => ({
  clearSurfaces: jest.fn(async () => {}),
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
