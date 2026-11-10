import { Platform } from 'react-native';
import Share from '../../../../modules/share';
import CookieManager from '@preeternal/react-native-cookie-manager';
import { dataSource, ensureSession } from 'data/source';
import { getCachedCourses } from 'data/queries';
import { Directory } from 'expo-file-system';
import {
  courseNameOf,
  downloadFile,
  getDownloadedFile,
  listDownloads,
  readCourseInfo,
  removeCourseDownloads,
  removeFileDir,
  removeLegacyDownloads,
} from 'helpers/files/downloads';

jest.mock('expo-file-system', () =>
  require('../../../../jest/mocks/memoryFileSystem'),
);
const { __fs } =
  jest.requireMock<typeof import('../../../../jest/mocks/memoryFileSystem')>(
    'expo-file-system',
  );

jest.mock('data/queries', () => ({ getCachedCourses: jest.fn(() => []) }));

jest.mock('data/source', () => ({
  addCSRF: (url: string) => `${url}&csrf=token`,
  dataSource: { prepareFileDownload: jest.fn(() => Promise.resolve()) },
  ensureSession: jest.fn(() => Promise.resolve()),
}));

const DOCUMENTS = 'file:///app/Documents';
const CACHES = 'file:///app/Caches';
const FILES = `${CACHES}/downloads`;
const LEGACY = 'learnX Files';

const fetchMock = jest.fn(() => Promise.resolve(new Response()));
globalThis.fetch = fetchMock as typeof fetch;

const os = Platform.OS;
const setOS = (value: typeof Platform.OS) =>
  Object.defineProperty(Platform, 'OS', { value, configurable: true });

const file = {
  id: 'f1',
  courseId: 'c1',
  courseName: 'Calculus',
  title: 'Lecture 1',
  fileType: 'pdf',
  downloadUrl:
    'https://learn.tsinghua.edu.cn/b/wlxt/kj/wlkc_kjxxb/student/downloadFile?sfgk=0&wjid=f1',
};
const target = `${FILES}/c1/f1/Lecture 1.pdf`;

const calculus = {
  id: 'c1',
  name: 'Calculus',
  chineseName: '微积分',
  englishName: 'Calculus',
  semesterId: '2025-2026-1',
};

beforeEach(() => {
  __fs.reset();
  jest.mocked(getCachedCourses).mockReturnValue([]);
  setOS('ios');
});

afterAll(() => setOS(os));

describe('getDownloadedFile', () => {
  it('keeps each file in <course id>/<file id>/ under downloads in Caches', () => {
    expect(getDownloadedFile(file).uri).toBe(target);
  });

  it('sanitizes the folder and file names', () => {
    expect(
      getDownloadedFile({ ...file, courseId: 'A/B', id: '../x', title: 'a:b' })
        .uri,
    ).toBe(`${FILES}/A_B/_x/a_b.pdf`);
  });
});

describe('downloadFile', () => {
  it.each(['file:///tmp/a.pdf', 'content://media/1'])(
    'returns the local file %s as it is',
    async url => {
      await expect(downloadFile({ ...file, downloadUrl: url })).resolves.toBe(
        url,
      );
      expect(__fs.tasks).toHaveLength(0);
    },
  );

  it('reuses a downloaded file unless asked to refresh', async () => {
    __fs.write(target, 'old');
    await expect(downloadFile(file)).resolves.toBe(target);
    expect(__fs.tasks).toHaveLength(0);

    await expect(downloadFile(file, { refresh: true })).resolves.toBe(target);
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

    await expect(downloadFile(file, { onProgress })).resolves.toBe(target);
    // Without the course cached, its name is the one the file was shown with.
    expect(JSON.parse(__fs.read(`${FILES}/c1/course.json`))).toEqual({
      name: 'Calculus',
    });

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
    jest.mocked(CookieManager.get).mockResolvedValue({
      a: { name: 'JSESSIONID', value: 'session' },
      b: { name: 'XSRF-TOKEN', value: 'token' },
    } as never);
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
    await expect(downloadFile(file, { refresh: true })).rejects.toThrow(
      'File download failed',
    );
    expect(__fs.files(CACHES)).toEqual([]);
    // The emptied <id> and course folders go too.
    expect(listDownloads()).toEqual([]);
    expect(__fs.dirs(FILES)).toEqual([]);
  });

  it('keeps the course folder when it holds other downloads', async () => {
    __fs.write(`${FILES}/c1/f2/b.pdf`, '56');
    __fs.download = () => Promise.reject(new Error('offline'));
    await expect(downloadFile(file)).rejects.toThrow('File download failed');
    expect(__fs.dirs(FILES)).toEqual(['c1', 'c1/f2']);
  });

  it('keeps the folders when they cannot be deleted', async () => {
    __fs.download = () => Promise.reject(new Error('offline'));
    const remove = jest
      .spyOn(Directory.prototype, 'delete')
      .mockImplementation(() => {
        throw new Error('busy');
      });
    await expect(downloadFile(file)).rejects.toThrow('File download failed');
    remove.mockRestore();
    expect(__fs.dirs(FILES)).toEqual(['c1', 'c1/f1']);
  });

  it('stops when its signal is aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      downloadFile(file, { signal: controller.signal }),
    ).rejects.toThrow('File download failed');
    expect(__fs.tasks[0].options.signal).toBe(controller.signal);
    expect(__fs.files(CACHES)).toEqual([]);
    expect(__fs.dirs(FILES)).toEqual([]);
  });
});

describe('course info', () => {
  it("saves the cached course's names and semester with its downloads", async () => {
    jest.mocked(getCachedCourses).mockReturnValue([calculus] as never);
    await downloadFile(file);
    expect(JSON.parse(__fs.read(`${FILES}/c1/course.json`))).toEqual({
      name: 'Calculus',
      chineseName: '微积分',
      englishName: 'Calculus',
      semesterId: '2025-2026-1',
    });
  });

  it('reads the cached course first, then course.json', () => {
    const dir = new Directory(`${FILES}/c1`);
    expect(readCourseInfo(dir)).toEqual({});
    expect(courseNameOf(dir)).toBe('c1');

    __fs.write(`${FILES}/c1/course.json`, JSON.stringify(calculus));
    expect(readCourseInfo(dir)).toEqual(calculus);
    expect(courseNameOf(dir)).toBe('Calculus');

    const cached = { ...calculus, englishName: 'Calculus I' };
    jest.mocked(getCachedCourses).mockReturnValue([cached] as never);
    expect(readCourseInfo(dir)).toBe(cached);
    expect(courseNameOf(dir)).toBe('Calculus I');
  });

  it.each(['not json', 'null', '"text"'])(
    'reads course.json holding %s as nothing',
    content => {
      __fs.write(`${FILES}/c1/course.json`, content);
      expect(readCourseInfo(new Directory(`${FILES}/c1`))).toEqual({});
    },
  );

  it('names a course by its only name', () => {
    expect(
      courseNameOf(new Directory(`${FILES}/c1`), { chineseName: '微积分' }),
    ).toBe('微积分');
  });
});

describe('downloads list', () => {
  beforeEach(() => {
    __fs.write(`${FILES}/c1/course.json`, JSON.stringify(calculus));
    __fs.write(`${FILES}/c1/f1/a.pdf`, '1234');
    __fs.write(`${FILES}/c1/f2/b.pdf`, '56');
    __fs.write(`${FILES}/c2/f3/c.pdf`, '12345678');
    __fs.mkdir(`${FILES}/empty`);
    __fs.mkdir(`${FILES}/c1/cancelled`);
    __fs.mkdir(`${FILES}/c3/cancelled`);
  });

  it('groups by course, largest first, without empty courses or folders', () => {
    expect(listDownloads()).toEqual([
      { courseId: 'c2', courseName: 'c2', count: 1, size: 8 },
      { courseId: 'c1', courseName: 'Calculus', count: 2, size: 6 },
    ]);
  });

  it('counts a folder whose size fails as empty', () => {
    const size = jest
      .spyOn(Directory.prototype, 'size', 'get')
      .mockImplementation(() => {
        throw new Error('gone');
      });
    expect(listDownloads().map(course => course.size)).toEqual([0, 0]);
    size.mockRestore();
  });

  it("deletes one course's downloads", () => {
    removeCourseDownloads('c1');
    expect(__fs.files(FILES)).toEqual(['c2/f3/c.pdf']);
  });
});

describe('removeFileDir', () => {
  it("deletes downloads, old versions' downloads and shared files", async () => {
    jest
      .mocked(Share!.getSharedFilesDirectory)
      .mockReturnValueOnce('file:///group/Shared');
    __fs.write(`${FILES}/c1/f1/a.pdf`, '1');
    __fs.write(`${CACHES}/${LEGACY}/Calculus/f1/a.pdf`, '1');
    __fs.write(`${DOCUMENTS}/${LEGACY}/Calculus/f2/b.pdf`, '2');
    __fs.write(`${CACHES}/learnX Shared/c.pdf`, '3');
    __fs.write('file:///group/Shared/d.pdf', '4');
    __fs.write(`${CACHES}/other.txt`, '5');

    await removeFileDir();

    expect(__fs.files('file:///app')).toEqual(['Caches/other.txt']);
    expect(__fs.files('file:///group')).toEqual([]);
  });

  it('names the folders it could not delete', async () => {
    __fs.write(`${FILES}/c1/f1/a.pdf`, '1');
    const remove = jest
      .spyOn(Directory.prototype, 'delete')
      .mockImplementationOnce(() => {
        throw new Error('busy');
      });
    await expect(removeFileDir()).rejects.toThrow('downloads');
    remove.mockRestore();
  });

  it('skips the share folder where there is none (Android)', async () => {
    __fs.write(`${CACHES}/learnX Shared/c.pdf`, '3');
    await removeFileDir();
    expect(__fs.files(CACHES)).toEqual([]);
  });
});

describe('removeLegacyDownloads', () => {
  it("deletes old versions' downloads in Caches and keeps the ones in Documents", () => {
    __fs.write(`${CACHES}/${LEGACY}/Calculus/f1/a.pdf`, '1');
    __fs.write(`${DOCUMENTS}/${LEGACY}/Calculus/f2/b.pdf`, '2');
    removeLegacyDownloads();
    removeLegacyDownloads();
    expect(__fs.files('file:///app')).toEqual([
      `Documents/${LEGACY}/Calculus/f2/b.pdf`,
    ]);
  });
});
