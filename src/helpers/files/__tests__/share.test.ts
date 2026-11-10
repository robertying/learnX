import * as IntentLauncher from 'expo-intent-launcher';
import Share from 'react-native-share';
import DeviceInfo from 'constants/DeviceInfo';
import {
  copyFileToCache,
  copyFileToMacDownloads,
  exportTextFile,
  openFile,
  shareFile,
} from 'helpers/files/share';

jest.mock('expo-file-system', () =>
  require('../../../../jest/mocks/memoryFileSystem'),
);
const { __fs } =
  jest.requireMock<typeof import('../../../../jest/mocks/memoryFileSystem')>(
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
jest.mock('constants/DeviceInfo', () => ({ isMac: jest.fn(() => false) }));

const CACHES = 'file:///app/Caches';
const file = {
  id: 'f1',
  courseName: 'Calculus',
  title: 'Lecture 1',
  fileType: 'pdf',
  downloadUrl: 'https://learn.tsinghua.edu.cn/f1',
};
const downloaded = `${CACHES}/learnX Files/Calculus/f1/Calculus-Lecture 1.pdf`;

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

it('exports text straight to Downloads on Mac', async () => {
  jest.mocked(DeviceInfo.isMac).mockReturnValue(true);
  await exportTextFile('c.ics', 'BEGIN', 'text/calendar');
  expect(__fs.files('file:///app/Downloads')).toEqual(['c.ics']);
  expect(Share.open).not.toHaveBeenCalled();
});

it('copies a file to the Mac Downloads folder', async () => {
  __fs.write(downloaded, 'pdf');
  await expect(copyFileToMacDownloads(file, downloaded)).resolves.toBe(
    'file:///app/Downloads/Lecture 1.pdf',
  );
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
