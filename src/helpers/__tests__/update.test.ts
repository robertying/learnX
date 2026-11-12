import { getLatestRelease } from 'helpers/update';

const mirror =
  'https://mirrors.tuna.tsinghua.edu.cn/github-release/robertying/learnX/LatestRelease';

const fetchMock = jest.fn<
  Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>,
  [string]
>(async () => ({
  ok: true,
  status: 200,
  json: async () => ({ version: '19.0.0' }),
}));

beforeEach(() => {
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

it("links the APK for the phone's ABI", async () => {
  await expect(getLatestRelease()).resolves.toEqual({
    version: '19.0.0',
    url: `${mirror}/learnX-arm64-v19.0.0.apk`,
  });
  expect(fetchMock).toHaveBeenCalledWith(`${mirror}/latest.json`);
});

it('fails when the mirror answers with an error', async () => {
  fetchMock.mockResolvedValueOnce({
    ok: false,
    status: 503,
    json: async () => ({}),
  });
  await expect(getLatestRelease()).rejects.toThrow('503');
});
