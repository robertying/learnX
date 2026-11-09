import { queryClient } from 'data/queryClient';
import { resetSettings } from 'data/settings';
import { migrateDownloads } from 'helpers/files/migrateDownloads';

jest.mock('expo-file-system', () =>
  require('../../../../jest/mocks/memoryFileSystem'),
);
const { __fs } =
  jest.requireMock<typeof import('../../../../jest/mocks/memoryFileSystem')>(
    'expo-file-system',
  );

jest.mock('data/source', () => ({}));
jest.mock('data/queryClient', () => {
  const { QueryClient } = require('@tanstack/react-query');
  return {
    queryClient: new QueryClient(),
    restoreQueryCache: jest.fn(() => Promise.resolve()),
  };
});

const DOCUMENTS = 'file:///app/Documents';
const CACHES = 'file:///app/Caches';
const FILES = `${CACHES}/learnX Files`;

beforeEach(() => {
  __fs.reset();
  queryClient.clear();
  resetSettings();
});

it('moves old <course>-<id> folders and leaves anything else', async () => {
  queryClient.setQueryData(
    ['files', 'semester'],
    [{ id: 'f9', courseName: 'Calculus-II' }],
  );
  queryClient.setQueryData(
    ['assignments', 'semester'],
    [
      {
        id: 'a1',
        courseName: 'Physics',
        attachment: { id: 'att1', downloadUrl: 'https://x' },
      },
    ],
  );
  // Known ids, even when the course name has a dash
  __fs.write(`${CACHES}/Calculus-II-f9/Calculus-II-Notes.pdf`, '1');
  __fs.write(`${DOCUMENTS}/Physics-att1/anything.pdf`, '2');
  // Unknown id: one file named after the course
  __fs.write(`${CACHES}/History-h1/History-Essay.docx`, '3');
  // Not downloads
  __fs.write(`${CACHES}/WebKit/NetworkCache`, '4');
  __fs.write(`${CACHES}/Two-files/Two-a`, '5');
  __fs.write(`${CACHES}/Two-files/Two-b`, '6');
  __fs.write(`${DOCUMENTS}/SQLite/learnX-db`, '7');

  await migrateDownloads();

  expect(__fs.files(FILES)).toEqual([
    'Calculus-II/f9/Calculus-II-Notes.pdf',
    'History/h1/History-Essay.docx',
    'Physics/att1/anything.pdf',
  ]);
  expect(__fs.files(CACHES)).toEqual(
    expect.arrayContaining([
      'WebKit/NetworkCache',
      'Two-files/Two-a',
      'Two-files/Two-b',
    ]),
  );
  expect(__fs.files(DOCUMENTS)).toEqual(['SQLite/learnX-db']);
});

it('moves downloads out of the folder the setting no longer uses', async () => {
  __fs.write(`${DOCUMENTS}/learnX Files/Calculus/f1/a.pdf`, '1');
  await migrateDownloads();
  expect(__fs.files(FILES)).toEqual(['Calculus/f1/a.pdf']);
});
