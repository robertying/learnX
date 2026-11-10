import { Directory } from 'expo-file-system';
import { getCachedCourses } from 'data/queries';
import { EXPORT_DIR, exportDownloads } from 'helpers/files/export';

jest.mock('expo-file-system', () =>
  require('../../../../jest/mocks/memoryFileSystem'),
);
const { __fs } =
  jest.requireMock<typeof import('../../../../jest/mocks/memoryFileSystem')>(
    'expo-file-system',
  );

jest.mock('data/queries', () => ({ getCachedCourses: jest.fn(() => []) }));
jest.mock('data/source', () => ({}));

const FILES = 'file:///app/Caches/downloads';
const PICKED = 'file:///picked';
const OUT = `${PICKED}/${EXPORT_DIR}`;
const FALL = 'Fall 2025-2026';

const calculus = {
  name: 'Calculus',
  chineseName: '微积分',
  englishName: 'Calculus',
  semesterId: '2025-2026-1',
};

beforeEach(() => {
  __fs.reset();
  __fs.mkdir(PICKED);
  __fs.pickedDirectory = PICKED;
  jest.mocked(getCachedCourses).mockReturnValue([]);

  __fs.write(`${FILES}/c1/course.json`, JSON.stringify(calculus));
  __fs.write(`${FILES}/c1/f1/Lecture 1.pdf`, 'one');
  __fs.write(`${FILES}/c1/f2/Lecture 1.pdf`, 'two');
  __fs.write(`${FILES}/c1/f3/notes`, 'three');
  __fs.mkdir(`${FILES}/c1/cancelled`);
});

it('copies files to learnX/<semester>/<course>/ in the picked folder', async () => {
  await expect(exportDownloads()).resolves.toEqual({ exported: 3, failed: 0 });
  expect(__fs.files(OUT)).toEqual([
    `${FALL}/Calculus/Lecture 1 (2).pdf`,
    `${FALL}/Calculus/Lecture 1.pdf`,
    `${FALL}/Calculus/notes`,
  ]);
  expect(__fs.read(`${OUT}/${FALL}/Calculus/Lecture 1.pdf`)).toBe('one');
  expect(__fs.read(`${OUT}/${FALL}/Calculus/Lecture 1 (2).pdf`)).toBe('two');
});

it('overwrites what an earlier export copied', async () => {
  await exportDownloads();
  __fs.write(`${FILES}/c1/f1/Lecture 1.pdf`, 'new');
  await expect(exportDownloads()).resolves.toEqual({ exported: 3, failed: 0 });
  expect(__fs.files(OUT)).toHaveLength(3);
  expect(__fs.read(`${OUT}/${FALL}/Calculus/Lecture 1.pdf`)).toBe('new');
});

it('names courses in the app language, without a semester when unknown', async () => {
  jest
    .mocked(getCachedCourses)
    .mockReturnValue([
      { ...calculus, id: 'c1', englishName: 'Calculus I' },
    ] as never);
  __fs.write(`${FILES}/c2/f4/a.pdf`, 'a');
  __fs.write(`${FILES}/c3/course.json`, JSON.stringify({ name: 'A/B' }));
  __fs.write(`${FILES}/c3/f5/b.pdf`, 'b');

  await exportDownloads();
  expect(__fs.dirs(OUT)).toEqual(['A_B', FALL, `${FALL}/Calculus I`, 'c2']);
});

it('shares a folder between courses of the same name', async () => {
  __fs.write(`${FILES}/c2/course.json`, JSON.stringify(calculus));
  __fs.write(`${FILES}/c2/f9/Lecture 1.pdf`, 'other');
  await exportDownloads();
  expect(__fs.files(`${OUT}/${FALL}/Calculus`)).toEqual([
    'Lecture 1 (2).pdf',
    'Lecture 1 (3).pdf',
    'Lecture 1.pdf',
    'notes',
  ]);
});

it("exports one course's files", async () => {
  __fs.write(`${FILES}/c2/f4/a.pdf`, 'a');
  __fs.mkdir(`${FILES}/c3/cancelled`);
  await expect(exportDownloads('c3')).resolves.toEqual({
    exported: 0,
    failed: 0,
  });
  await expect(exportDownloads('c2')).resolves.toEqual({
    exported: 1,
    failed: 0,
  });
  expect(__fs.files(OUT)).toEqual(['c2/a.pdf']);
});

it('counts files it could not copy and goes on', async () => {
  const { File } =
    jest.requireMock<typeof import('../../../../jest/mocks/memoryFileSystem')>(
      'expo-file-system',
    );
  const copy = jest
    .spyOn(File.prototype, 'copy')
    .mockRejectedValueOnce(new Error('full'));
  await expect(exportDownloads()).resolves.toEqual({ exported: 2, failed: 1 });
  copy.mockRestore();
});

it('leaves no renamed copies behind', async () => {
  await exportDownloads();
  expect(__fs.files('file:///app/Caches/export')).toEqual([]);
  expect(__fs.dirs('file:///app/Caches')).not.toContain('export');
});

it('resolves to null when the picker is cancelled', async () => {
  __fs.pickedDirectory = null;
  await expect(exportDownloads()).resolves.toBeNull();
  expect(__fs.dirs(PICKED)).toEqual([]);
});

it('rejects when the picker fails otherwise', async () => {
  jest
    .mocked(Directory.pickDirectoryAsync)
    .mockRejectedValueOnce(new Error('no access'));
  await expect(exportDownloads()).rejects.toThrow('no access');
});
