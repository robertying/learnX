import * as IntentLauncher from 'expo-intent-launcher';
import Share from 'react-native-share';
import DeviceInfo from 'constants/DeviceInfo';
import ShareModule from '../../../../modules/share';
import {
  copyFileToCache,
  exportTextFile,
  openFile,
  saveFileOnMac,
  shareFile,
} from 'services/files/share';

jest.mock('expo-file-system', () =>
  require('test-utils/mocks/memoryFileSystem'),
);
const { __fs } =
  jest.requireMock<typeof import('test-utils/mocks/memoryFileSystem')>(
    'expo-file-system',
  );

jest.mock('expo-intent-launcher', () => ({
  startActivityAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('react-native-share', () => ({
  __esModule: true,
  default: { open: jest.fn(() => Promise.resolve()) },
}));
jest.mock('data/source', () => ({}));
jest.mock('data/queries', () => ({ getCachedCourses: () => [] }));
jest.mock('constants/DeviceInfo', () => ({ isMac: jest.fn(() => false) }));

const CACHES = 'file:///app/Caches';
const file = {
  id: 'f1',
  courseId: 'c1',
  courseName: 'Calculus',
  title: 'Lecture 1',
  fileType: 'pdf',
  downloadUrl: 'https://learn.tsinghua.edu.cn/f1',
};
const downloaded = `${CACHES}/downloads/c1/f1/Lecture 1.pdf`;

beforeEach(() => {
  __fs.reset();
  jest.mocked(DeviceInfo.isMac).mockReturnValue(false);
});

it('shares a downloaded file with its type', async () => {
  __fs.write(downloaded, 'pdf');
  await shareFile(file);
  expect(Share.open).toHaveBeenCalledWith(
    expect.objectContaining({
      filename: 'Lecture 1.pdf',
      url: downloaded,
      type: 'application/pdf',
    }),
  );
});

it('exports text through the share sheet', async () => {
  await exportTextFile('a/b.ics', 'BEGIN', 'text/calendar');
  expect(__fs.files(CACHES)).toEqual(['a_b.ics']);
  expect(Share.open).toHaveBeenCalledWith(
    expect.objectContaining({
      url: `${CACHES}/a_b.ics`,
      type: 'text/calendar',
    }),
  );
});

describe('on Mac', () => {
  const saveFile = jest.mocked(ShareModule!.saveFile);
  let saved: Record<string, string>;

  beforeEach(() => {
    jest.mocked(DeviceInfo.isMac).mockReturnValue(true);
    saved = {};
    saveFile.mockImplementation(async uri => {
      saved[uri] = __fs.read(uri);
      return true;
    });
  });

  it('asks where to save exported text', async () => {
    await exportTextFile('a/b.ics', 'BEGIN', 'text/calendar');
    expect(saved).toEqual({ [`${CACHES}/save/a_b.ics`]: 'BEGIN' });
    expect(Share.open).not.toHaveBeenCalled();
    // The copy for the save panel goes after.
    expect(__fs.files(`${CACHES}/save`)).toEqual([]);
  });

  it('asks where to save a downloaded file, under its title', async () => {
    __fs.write(downloaded, 'pdf');
    await expect(saveFileOnMac(file, downloaded)).resolves.toBe(true);
    expect(saved).toEqual({ [`${CACHES}/save/Lecture 1.pdf`]: 'pdf' });

    saveFile.mockResolvedValueOnce(false);
    await expect(saveFileOnMac(file, downloaded)).resolves.toBe(false);
    expect(__fs.files(`${CACHES}/save`)).toEqual([]);
  });
});

it('copies a file shared into the app to Caches', async () => {
  __fs.write('file:///inbox/a:b.pdf', 'pdf');
  await expect(copyFileToCache('file:///inbox/a:b.pdf')).resolves.toBe(
    `${CACHES}/learnX Shared/a_b.pdf`,
  );
});

it('opens a file in another Android app by its content URI', async () => {
  await openFile(downloaded, 'pdf');
  expect(IntentLauncher.startActivityAsync).toHaveBeenCalledWith(
    'android.intent.action.VIEW',
    {
      type: 'application/pdf',
      data: downloaded.replace('file://', 'content://'),
      flags: 1,
    },
  );
});

it('shares and opens a file of unknown type as plain bytes', async () => {
  const unknown = { ...file, fileType: 'xyz123' };
  const path = `${CACHES}/downloads/c1/f1/Lecture 1.xyz123`;
  __fs.write(path, 'data');
  await shareFile(unknown);
  expect(Share.open).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'application/octet-stream' }),
  );

  // Already a content URI: opened as it is
  await openFile('content://media/1', null);
  expect(IntentLauncher.startActivityAsync).toHaveBeenLastCalledWith(
    'android.intent.action.VIEW',
    {
      type: 'application/octet-stream',
      data: 'content://media/1',
      flags: 1,
    },
  );
});
