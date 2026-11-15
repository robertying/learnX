import { Platform } from 'react-native';
import Share from 'modules/share';
import { FailReason } from '@robertying/thu-learn-lib';
import { dataSource } from 'data/source';
import { getCachedCourses } from 'data/queries';
import { Directory, File as FileSystemFile } from 'expo-file-system';
import {
  courseNameOf,
  downloadFile,
  getDownloadedFile,
  listDownloads,
  readCourseInfo,
  removeCourseDownloads,
  removeFileDir,
  removeLegacyDownloads,
} from 'services/files/downloads';

jest.mock('expo-file-system', () =>
  require('test-utils/mocks/memoryFileSystem'),
);
const { __fs } =
  jest.requireMock<typeof import('test-utils/mocks/memoryFileSystem')>(
    'expo-file-system',
  );

jest.mock('data/queries', () => ({ getCachedCourses: jest.fn(() => []) }));

// The real thu-learn-lib helper, logged in with a token and without a login
// of its own (an expired session then fails with NOT_LOGGED_IN; thu-learn-lib's
// tests cover logging in again), sending the check with the fetch below.
jest.mock('data/source', () => {
  const { Learn2018Helper } = jest.requireActual<
    typeof import('@robertying/thu-learn-lib')
  >('@robertying/thu-learn-lib');
  const helper = new Learn2018Helper({
    cookieHeader: () => 'JSESSIONID=session',
  });
  helper.setCSRFToken('token');
  return {
    dataSource: {
      download: jest.fn(helper.download.bind(helper)),
    },
  };
});

const DOCUMENTS = 'file:///app/Documents';
const CACHES = 'file:///app/Caches';
const FILES = `${CACHES}/downloads`;
const PARTIAL = `${CACHES}/downloads-partial`;
const LEGACY = 'learnX Files';

const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>(() =>
  Promise.resolve(new Response()),
);
globalThis.fetch = fetchMock as typeof fetch;

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
  jest.replaceProperty(Platform, 'OS', 'ios');
});

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
    expect(dataSource.download).toHaveBeenCalledTimes(1);
    expect(__fs.tasks).toHaveLength(1);
  });

  it('rejects a URL that is not http(s)', async () => {
    await expect(
      downloadFile({ ...file, downloadUrl: 'ftp://host/a.pdf' }),
    ).rejects.toThrow('Invalid file url');
  });

  it('downloads what thu-learn-lib hands it: the check first, then the file with the token and cookies', async () => {
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

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://learn.tsinghua.edu.cn/b/wlxt/kj/wlkc_kjxxb/student/downloadFileBefore?wjid=f1&_csrf=token',
    );
    const [task] = __fs.tasks;
    expect(task.url).toBe(`${file.downloadUrl}&_csrf=token`);
    expect(task.options.headers).toEqual({ Cookie: 'JSESSIONID=session' });
    expect(task.release).toHaveBeenCalled();
    // BigInt byte counts work; an unknown total reports nothing.
    expect(onProgress.mock.calls).toEqual([[0.33]]);
  });

  it('downloads into downloads-partial, then moves the whole file into place', async () => {
    let during: string[] = [];
    __fs.download = async task => {
      __fs.write(task.target.uri, 'body');
      during = __fs.files(CACHES);
      return task.target;
    };
    await expect(downloadFile(file)).resolves.toBe(target);
    expect(during).toEqual([
      expect.stringMatching(/^downloads-partial\/[\w-]+$/),
    ]);
    expect(__fs.files(PARTIAL)).toEqual([]);
    expect(__fs.read(target)).toBe('body');
  });

  const REDIRECT = '<script>location.href="/f/login_timeout";</script>';
  const httpError = (status: number) =>
    new Error(`Unable to download a file: server returned HTTP ${status}`);

  it.each([
    [
      'gets no answer',
      () => Promise.reject(new Error('offline')),
      { reason: FailReason.NETWORK_ERROR },
    ],
    [
      'saves an empty file',
      async (task: { target: { uri: string } }) => {
        __fs.write(task.target.uri, '');
        return task.target;
      },
      { reason: FailReason.INVALID_RESPONSE },
    ],
    [
      'saves nothing',
      () => Promise.resolve(null),
      { reason: FailReason.INVALID_RESPONSE },
    ],
    [
      'gets an error status (iOS)',
      () => Promise.reject(httpError(500)),
      { reason: FailReason.UNEXPECTED_STATUS, extra: { code: 500 } },
    ],
    [
      'gets an error status (Android)',
      () => Promise.reject(new Error('Unable to download a file: HTTP 502')),
      { reason: FailReason.UNEXPECTED_STATUS, extra: { code: 502 } },
    ],
    [
      "gets an expired session's 403",
      () => Promise.reject(httpError(403)),
      { reason: FailReason.NOT_LOGGED_IN },
    ],
    [
      "saves an expired session's redirect page",
      async (task: { target: { uri: string } }) => {
        __fs.write(task.target.uri, REDIRECT);
        return task.target;
      },
      { reason: FailReason.NOT_LOGGED_IN },
    ],
  ])(
    'rejects as thu-learn-lib does, deletes the partial file and keeps the old copy when it %s',
    async (_, download, error) => {
      __fs.download = download as typeof __fs.download;
      __fs.write(target, 'old');
      await expect(downloadFile(file, { refresh: true })).rejects.toMatchObject(
        error,
      );
      expect(__fs.files(CACHES)).toEqual(['downloads/c1/f1/Lecture 1.pdf']);
      expect(__fs.read(target)).toBe('old');
    },
  );

  it('takes a large file that mentions a redirect for the file', async () => {
    __fs.download = async task => {
      __fs.write(task.target.uri, REDIRECT + 'x'.repeat(5000));
      return task.target;
    };
    await expect(downloadFile(file)).resolves.toBe(target);
  });

  it('makes no folders for a download that failed', async () => {
    __fs.download = (task: { target: { uri: string } }) => {
      // Android writes into the file as it downloads.
      __fs.write(task.target.uri, 'part');
      return Promise.reject(new Error('offline'));
    };
    await expect(downloadFile(file)).rejects.toMatchObject({
      reason: FailReason.NETWORK_ERROR,
    });
    expect(__fs.files(CACHES)).toEqual([]);
    expect(listDownloads()).toEqual([]);
    expect(__fs.dirs(FILES)).toEqual([]);
  });

  it('keeps the course folder when it holds other downloads', async () => {
    __fs.write(`${FILES}/c1/f2/b.pdf`, '56');
    __fs.download = () => Promise.reject(new Error('offline'));
    await expect(downloadFile(file)).rejects.toMatchObject({
      reason: FailReason.NETWORK_ERROR,
    });
    expect(__fs.dirs(FILES)).toEqual(['c1', 'c1/f2']);
  });

  it('deletes the partial file and the emptied folders when it cannot be moved', async () => {
    __fs.write(`${FILES}/c1/f2/b.pdf`, '56');
    const move = jest
      .spyOn(FileSystemFile.prototype, 'moveSync')
      .mockImplementation(() => {
        throw new Error('full');
      });
    await expect(downloadFile(file)).rejects.toThrow('File download failed');
    move.mockRestore();
    expect(__fs.files(CACHES)).toEqual(['downloads/c1/f2/b.pdf']);
    expect(__fs.dirs(FILES)).toEqual(['c1', 'c1/f2']);
  });

  it('keeps the folders when they cannot be deleted', async () => {
    jest.spyOn(FileSystemFile.prototype, 'moveSync').mockImplementation(() => {
      throw new Error('full');
    });
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
    ).rejects.toHaveProperty('name', 'AbortError');
    expect(__fs.tasks[0].options.signal).toBe(controller.signal);
    expect(__fs.files(CACHES)).toEqual([]);
    expect(__fs.dirs(FILES)).toEqual([]);
  });
});

describe('downloads cut short', () => {
  /** A fresh downloads module, as at launch, with its own file system. */
  const freshModules = () => {
    let modules!: {
      downloads: typeof import('services/files/downloads');
      fs: typeof import('test-utils/mocks/memoryFileSystem');
    };
    jest.isolateModules(() => {
      modules = {
        downloads: require('services/files/downloads'),
        fs: jest.requireMock('expo-file-system'),
      };
    });
    return modules;
  };

  it("are deleted before this run's first download, and only then", async () => {
    const {
      downloads,
      fs: { __fs: fs },
    } = freshModules();
    fs.write(`${PARTIAL}/killed`, 'part');
    let during: string[] = [];
    fs.download = async task => {
      fs.write(task.target.uri, 'body');
      during = fs.files(PARTIAL);
      return task.target;
    };

    await downloads.downloadFile(file);
    expect(during).toHaveLength(1);
    expect(during).not.toContain('killed');

    // A download under way when the next one starts is left alone.
    fs.write(`${PARTIAL}/running`, 'part');
    await downloads.downloadFile({ ...file, id: 'f2' });
    expect(fs.files(PARTIAL)).toEqual(['running']);
  });

  it("are left alone when they can't be deleted", async () => {
    const { downloads, fs } = freshModules();
    fs.__fs.write(`${PARTIAL}/killed`, 'part');
    jest.spyOn(fs.Directory.prototype, 'delete').mockImplementationOnce(() => {
      throw new Error('busy');
    });
    await expect(downloads.downloadFile(file)).resolves.toBe(target);
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
  it('deletes downloads and shared files', async () => {
    jest
      .mocked(Share!.getSharedFilesDirectory)
      .mockReturnValueOnce('file:///group/Shared');
    __fs.write(`${FILES}/c1/f1/a.pdf`, '1');
    __fs.write(`${CACHES}/learnX Shared/c.pdf`, '3');
    __fs.write(`${PARTIAL}/x`, '6');
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
  it("deletes old versions' downloads in Caches and Documents", () => {
    __fs.write(`${CACHES}/${LEGACY}/Calculus/f1/a.pdf`, '1');
    __fs.write(`${DOCUMENTS}/${LEGACY}/Calculus/f2/b.pdf`, '2');
    __fs.write(`${DOCUMENTS}/SQLite/db`, '3');
    removeLegacyDownloads();
    removeLegacyDownloads();
    expect(__fs.files('file:///app')).toEqual(['Documents/SQLite/db']);
  });
});
