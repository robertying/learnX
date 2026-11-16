import {
  createReleasesProvider,
  latestElectronTag,
} from '../releasesProvider.cjs';

const entry = (tag: string) =>
  `<entry><link rel="alternate" type="text/html" href="https://github.com/robertying/learnX/releases/tag/${tag}"/></entry>`;

describe('latestElectronTag', () => {
  it("picks the newest Electron release, whatever the mobile ones' order", () => {
    const feed = [
      'v19.1.0',
      'electron-v19.0.1',
      'electron-v19.0.10',
      'v19.0.0',
      'electron-v19.0.9',
      'electron-v18.9.9',
    ]
      .map(entry)
      .join('');
    expect(latestElectronTag(feed)).toBe('electron-v19.0.10');
  });

  it('leaves out pre-releases and other tags', () => {
    expect(
      latestElectronTag(
        [
          'electron-v20.0.0-beta.1',
          'electron-vnext',
          'v20.0.0',
          'electron-v19.0.0',
        ]
          .map(entry)
          .join(''),
      ),
    ).toBe('electron-v19.0.0');
    expect(latestElectronTag(entry('v19.0.0'))).toBeNull();
    expect(latestElectronTag('')).toBeNull();
  });

  it('compares each part of the version', () => {
    expect(
      latestElectronTag(
        ['electron-v19.2.0', 'electron-v20.0.0', 'electron-v19.10.0']
          .map(entry)
          .join(''),
      ),
    ).toBe('electron-v20.0.0');
    expect(
      latestElectronTag(
        ['electron-v19.0.0', 'electron-v19.0.0'].map(entry).join(''),
      ),
    ).toBe('electron-v19.0.0');
  });
});

describe('ElectronReleasesProvider', () => {
  /** electron-updater's Provider base and helpers, as far as it uses them. */
  class Provider {
    constructor(readonly runtimeOptions: { platform: string }) {}
    getDefaultChannelName() {
      return this.runtimeOptions.platform === 'linux'
        ? 'latest-linux'
        : 'latest';
    }
    httpRequest = jest.fn(async (url: URL) => responses[url.href] ?? null);
  }
  const parseUpdateInfo = jest.fn(
    (raw: string, channelFile: string, channelUrl: URL) => ({
      raw,
      channelFile,
      channelUrl: channelUrl.href,
    }),
  );
  const resolveFiles = jest.fn((info: unknown, baseUrl: URL) => [
    { info, baseUrl: baseUrl.href },
  ]);
  const ElectronReleasesProvider = createReleasesProvider({
    Provider,
    parseUpdateInfo,
    resolveFiles,
  });
  let responses: Record<string, string> = {};

  beforeEach(() => {
    responses = {
      'https://github.com/robertying/learnX/releases.atom': [
        'v19.1.0',
        'electron-v19.0.1',
        'electron-v19.0.0',
      ]
        .map(entry)
        .join(''),
      'https://github.com/robertying/learnX/releases/download/electron-v19.0.1/latest.yml':
        'version: 19.0.1',
      'https://github.com/robertying/learnX/releases/download/electron-v19.0.1/latest-linux.yml':
        'version: 19.0.1 linux',
    };
  });

  it("reads the newest Electron release's update file", async () => {
    const provider = new ElectronReleasesProvider(
      { url: 'https://github.com/robertying/learnX' },
      {},
      { platform: 'win32' },
    );
    const info = await provider.getLatestVersion();
    expect(info).toEqual({
      raw: 'version: 19.0.1',
      channelFile: 'latest.yml',
      channelUrl:
        'https://github.com/robertying/learnX/releases/download/electron-v19.0.1/latest.yml',
    });
    expect(provider.resolveFiles(info)).toEqual([
      {
        info,
        baseUrl:
          'https://github.com/robertying/learnX/releases/download/electron-v19.0.1/',
      },
    ]);
  });

  it("reads Linux's update file there", async () => {
    const provider = new ElectronReleasesProvider(
      { url: 'https://github.com/robertying/learnX/' },
      {},
      { platform: 'linux' },
    );
    expect(await provider.getLatestVersion()).toMatchObject({
      raw: 'version: 19.0.1 linux',
    });
  });

  it('fails when no Electron release is out', async () => {
    responses['https://github.com/robertying/learnX/releases.atom'] =
      entry('v19.0.0');
    const provider = new ElectronReleasesProvider(
      { url: 'https://github.com/robertying/learnX' },
      {},
      { platform: 'win32' },
    );
    await expect(provider.getLatestVersion()).rejects.toMatchObject({
      code: 'ERR_UPDATER_LATEST_VERSION_NOT_FOUND',
    });
    delete responses['https://github.com/robertying/learnX/releases.atom'];
    await expect(provider.getLatestVersion()).rejects.toThrow(
      'No electron-v* release',
    );
  });
});
