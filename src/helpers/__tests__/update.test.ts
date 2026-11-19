import env from 'helpers/env';
import { E2E_UPDATE_URL, getLatestRelease } from 'helpers/update';

const mirror =
  'https://mirrors.tuna.tsinghua.edu.cn/github-release/robertying/learnX/LatestRelease';

const fetchMock = jest.fn<
  Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>,
  [string]
>(async () => ({
  ok: true,
  status: 200,
  json: async () => ({
    version: '19.0.0',
    files: [
      { name: 'learnX-x86_64-v19.0.0.apk', size: 2, sha256: 'other' },
      { name: 'learnX-arm64-v19.0.0.apk', size: 1, sha256: 'abc' },
    ],
  }),
}));

beforeEach(() => {
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

it("links the APK for the phone's ABI, with its checksum and size", async () => {
  await expect(getLatestRelease()).resolves.toEqual({
    version: '19.0.0',
    url: `${mirror}/learnX-arm64-v19.0.0.apk`,
    sha256: 'abc',
    size: 1,
  });
  expect(fetchMock).toHaveBeenCalledWith(`${mirror}/latest.json`);
});

it('links the APK without a checksum where latest.json lists none', async () => {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ version: '19.0.0' }),
  });
  await expect(getLatestRelease()).resolves.toEqual({
    version: '19.0.0',
    url: `${mirror}/learnX-arm64-v19.0.0.apk`,
    sha256: undefined,
    size: undefined,
  });
});

it('asks the local test server in E2E builds', async () => {
  const testEnv = env as { TEST_LOGIN?: boolean };
  testEnv.TEST_LOGIN = true;
  try {
    await expect(getLatestRelease()).resolves.toMatchObject({
      url: `${E2E_UPDATE_URL}/learnX-arm64-v19.0.0.apk`,
    });
    expect(fetchMock).toHaveBeenCalledWith(`${E2E_UPDATE_URL}/latest.json`);
  } finally {
    delete testEnv.TEST_LOGIN;
  }
});

it('fails when the mirror answers with an error', async () => {
  fetchMock.mockResolvedValueOnce({
    ok: false,
    status: 503,
    json: async () => ({}),
  });
  await expect(getLatestRelease()).rejects.toThrow('503');
});

it.each([{}, { version: 19 }, { version: '19.1' }])(
  'fails when latest.json has no version semver reads: %j',
  async json => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => json,
    });
    await expect(getLatestRelease()).rejects.toThrow('no version');
  },
);
