import { Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import Share from 'react-native-share';
import ShareMenu from 'react-native-share-menu';
import CookieManager from '@preeternal/react-native-cookie-manager';
import { dataSource, ensureSession } from 'data/source';
import { queryClient } from 'data/queryClient';
import { resetSettings, setSetting } from 'data/settings';
import DeviceInfo from 'constants/DeviceInfo';
import {
  copyFileToCache,
  copyFileToMacDownloads,
  downloadFile,
  exportTextFile,
  getDownloadedFile,
  listDownloads,
  migrateDownloads,
  moveDownloadsToCurrentDirectory,
  openFile,
  removeCourseDownloads,
  removeFileDir,
  shareFile,
} from 'helpers/fs';

jest.mock('expo-file-system', () =>
  require('../../../jest/mocks/memoryFileSystem'),
);
const { __fs } =
  jest.requireMock<typeof import('../../../jest/mocks/memoryFileSystem')>(
    'expo-file-system',
  );

jest.mock('expo-intent-launcher', () => ({
  startActivityAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('react-native-share', () => ({
  __esModule: true,
  default: { open: jest.fn(() => Promise.resolve()) },
}));
jest.mock('react-native-share-menu', () => ({
  __esModule: true,
  default: { getSharedCacheDirectory: jest.fn() },
}));
jest.mock('@preeternal/react-native-cookie-manager', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() =>
      Promise.resolve({
        a: { name: 'JSESSIONID', value: 'session' },
        b: { name: 'XSRF-TOKEN', value: 'token' },
      }),
    ),
  },
}));
jest.mock('data/source', () => ({
  addCSRF: (url: string) => `${url}&csrf=token`,
  dataSource: { prepareFileDownload: jest.fn(() => Promise.resolve()) },
  ensureSession: jest.fn(() => Promise.resolve()),
}));
jest.mock('data/queryClient', () => {
  const { QueryClient } = require('@tanstack/react-query');
  return {
    queryClient: new QueryClient(),
    restoreQueryCache: jest.fn(() => Promise.resolve()),
  };
});
jest.mock('constants/DeviceInfo', () => ({ isMac: jest.fn(() => false) }));

const DOCUMENTS = 'file:///app/Documents';
const CACHES = 'file:///app/Caches';
const FILES = `${CACHES}/learnX Files`;

const fetchMock = jest.fn(() => Promise.resolve(new Response()));
globalThis.fetch = fetchMock as typeof fetch;

const os = Platform.OS;
const setOS = (value: typeof Platform.OS) =>
  Object.defineProperty(Platform, 'OS', { value, configurable: true });

const file = {
  id: 'f1',
  courseName: 'Calculus',
  title: 'Lecture 1',
  fileType: 'pdf',
  downloadUrl:
    'https://learn.tsinghua.edu.cn/b/wlxt/kj/wlkc_kjxxb/student/downloadFile?sfgk=0&wjid=f1',
};
const target = `${FILES}/Calculus/f1/Calculus-Lecture 1.pdf`;

beforeEach(() => {
  __fs.reset();
  queryClient.clear();
  resetSettings();
  setOS('ios');
  jest.mocked(DeviceInfo.isMac).mockReturnValue(false);
});

afterAll(() => setOS(os));

describe('getDownloadedFile', () => {
  it('keeps each file in <course>/<id>/ under learnX Files in Caches', () => {
    expect(getDownloadedFile(file).uri).toBe(target);
  });

  it('follows the folder and name settings', () => {
    setSetting('fileUseDocumentDir', true);
    setSetting('fileOmitCourseName', true);
    expect(getDownloadedFile(file).uri).toBe(
      `${DOCUMENTS}/learnX Files/Calculus/f1/Lecture 1.pdf`,
    );
  });

  it('sanitizes the course and id folder names', () => {
    expect(
      getDownloadedFile({ ...file, courseName: 'A/B', id: '../x' }).uri,
    ).toBe(`${FILES}/A_B/_x/A_B-Lecture 1.pdf`);
  });
});

describe('downloadFile', () => {
  it('returns a local file as it is', async () => {
    for (const url of ['file:///tmp/a.pdf', 'content://media/1']) {
      await expect(downloadFile({ ...file, downloadUrl: url })).resolves.toBe(
        url,
      );
    }
    expect(__fs.tasks).toHaveLength(0);
  });

  it('reuses a downloaded file unless asked to refresh', async () => {
    __fs.write(target, 'old');
    await expect(downloadFile(file)).resolves.toBe(target);
    expect(__fs.tasks).toHaveLength(0);

    await expect(downloadFile(file, true)).resolves.toBe(target);
    expect(ensureSession).toHaveBeenCalled();
    expect(__fs.tasks).toHaveLength(1);
  });

  it('rejects a URL that is not http(s)', async () => {
    await expect(
      downloadFile({ ...file, downloadUrl: 'ftp://host/a.pdf' }),
    ).rejects.toThrow('Invalid file url');
  });

  it('runs the server check, then downloads with the CSRF token', async () => {
    const onProgress = jest.fn();
    __fs.download = async task => {
      task.options.onProgress?.({ bytesWritten: 1n, totalBytes: 3n });
      task.options.onProgress?.({ bytesWritten: 0, totalBytes: 0 });
      __fs.write(task.target.uri, 'body');
      return task.target;
    };

    await expect(downloadFile(file, false, onProgress)).resolves.toBe(target);

    expect(dataSource.prepareFileDownload).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://learn.tsinghua.edu.cn/b/wlxt/kj/wlkc_kjxxb/student/downloadFileBefore?wjid=f1&csrf=token',
    );
    const [task] = __fs.tasks;
    expect(task.url).toBe(`${file.downloadUrl}&csrf=token`);
    // iOS sends cookies from the shared store by itself.
    expect(task.options.headers).toBeUndefined();
    expect(task.release).toHaveBeenCalled();
    // BigInt byte counts work; an unknown total reports nothing.
    expect(onProgress.mock.calls).toEqual([[0.33]]);
  });

  it('sends the login cookies on Android, only to Web Learning', async () => {
    setOS('android');
    await downloadFile(file);
    expect(__fs.tasks[0].options.headers).toEqual({
      Cookie: 'JSESSIONID=session; XSRF-TOKEN=token; ',
    });

    await downloadFile({ ...file, id: 'f2', downloadUrl: 'https://cdn/x' });
    expect(__fs.tasks[1].options.headers).toBeUndefined();
    expect(CookieManager.get).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['fails', () => Promise.reject(new Error('offline'))],
    ['returns nothing', () => Promise.resolve(null)],
    [
      'saves an empty file',
      async (task: { target: { uri: string } }) => {
        __fs.write(task.target.uri, '');
        return task.target;
      },
    ],
    [
      "saves the server's login redirect",
      async (task: { target: { uri: string } }) => {
        __fs.write(task.target.uri, '<script>location.href="/"</script>');
        return task.target;
      },
    ],
  ])('throws and deletes the partial file when it %s', async (_, download) => {
    __fs.download = download as typeof __fs.download;
    __fs.write(target, 'partial');
    await expect(downloadFile(file, true)).rejects.toThrow(
      'File download failed',
    );
    expect(__fs.files(CACHES)).toEqual([]);
  });
});

describe('downloads list', () => {
  beforeEach(() => {
    __fs.write(`${FILES}/Calculus/f1/a.pdf`, '1234');
    __fs.write(`${FILES}/Calculus/f2/b.pdf`, '56');
    __fs.write(`${FILES}/Physics/f3/c.pdf`, '12345678');
    __fs.mkdir(`${FILES}/Empty`);
  });

  it('groups by course, largest first, without empty courses', () => {
    expect(listDownloads()).toEqual([
      { courseName: 'Physics', count: 1, size: 8 },
      { courseName: 'Calculus', count: 2, size: 6 },
    ]);
  });

  it("deletes one course's downloads", () => {
    removeCourseDownloads('Calculus');
    expect(__fs.files(FILES)).toEqual(['Physics/f3/c.pdf']);
  });
});

describe('moveDownloadsToCurrentDirectory', () => {
  it('moves downloads from the other folder; a copy already there wins', () => {
    __fs.write(`${DOCUMENTS}/learnX Files/Calculus/f1/a.pdf`, 'moved');
    __fs.write(`${DOCUMENTS}/learnX Files/Calculus/f2/b.pdf`, 'dropped');
    __fs.write(`${FILES}/Calculus/f2/b.pdf`, 'kept');

    moveDownloadsToCurrentDirectory();

    expect(__fs.files(FILES)).toEqual([
      'Calculus/f1/a.pdf',
      'Calculus/f2/b.pdf',
    ]);
    expect(__fs.files(DOCUMENTS)).toEqual([]);
  });
});

describe('migrateDownloads', () => {
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
    expect(__fs.files(CACHES)).toContain('WebKit/NetworkCache');
    expect(__fs.files(CACHES)).toContain('Two-files/Two-a');
    expect(__fs.files(DOCUMENTS)).toEqual(['SQLite/learnX-db']);
  });
});

describe('removeFileDir', () => {
  it('deletes downloads in both folders and shared files', async () => {
    jest
      .mocked(ShareMenu.getSharedCacheDirectory)
      .mockImplementation(callback => callback('/group/Shared'));
    __fs.write(`${FILES}/Calculus/f1/a.pdf`, '1');
    __fs.write(`${DOCUMENTS}/learnX Files/Calculus/f2/b.pdf`, '2');
    __fs.write(`${CACHES}/learnX Shared/c.pdf`, '3');
    __fs.write('file:///group/Shared/d.pdf', '4');
    __fs.write(`${CACHES}/other.txt`, '5');

    await removeFileDir();

    expect(__fs.files('file:///app')).toEqual(['Caches/other.txt']);
  });

  it("doesn't ask for the share extension's folder on Android", async () => {
    setOS('android');
    await removeFileDir();
    expect(ShareMenu.getSharedCacheDirectory).not.toHaveBeenCalled();
  });
});

describe('sharing and exporting', () => {
  it('shares a downloaded file with its type', async () => {
    __fs.write(target, 'pdf');
    await shareFile(file);
    expect(Share.open).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'Lecture 1.pdf',
        url: target,
        type: 'application/pdf',
      }),
    );
  });

  it('exports text through the share sheet, or to Downloads on Mac', async () => {
    await exportTextFile('a/b.ics', 'BEGIN', 'text/calendar');
    expect(__fs.files(CACHES)).toEqual(['a_b.ics']);
    expect(Share.open).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${CACHES}/a_b.ics`,
        type: 'text/calendar',
      }),
    );

    jest.mocked(DeviceInfo.isMac).mockReturnValue(true);
    await exportTextFile('c.ics', 'BEGIN', 'text/calendar');
    expect(__fs.files('file:///app/Downloads')).toEqual(['c.ics']);
    expect(Share.open).toHaveBeenCalledTimes(1);
  });

  it('copies a file to the Mac Downloads folder', async () => {
    __fs.write(target, 'pdf');
    await expect(copyFileToMacDownloads(file, target)).resolves.toBe(
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
    await openFile(target, 'pdf');
    expect(IntentLauncher.startActivityAsync).toHaveBeenCalledWith(
      'android.intent.action.VIEW',
      {
        type: 'application/pdf',
        data: target.replace('file://', 'content://'),
        flags: 1,
      },
    );
  });
});
