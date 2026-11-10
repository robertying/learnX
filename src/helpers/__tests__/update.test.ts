import { Platform } from 'react-native';
import { getLatestRelease } from 'helpers/update';

const mirror =
  'https://mirrors.tuna.tsinghua.edu.cn/github-release/robertying/learnX/LatestRelease';

const os = Platform.OS;
const fetchMock = jest.fn<Promise<{ json: () => Promise<unknown> }>, [string]>(
  async () => ({ json: async () => ({ version: '19.0.0' }) }),
);

beforeEach(() => {
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  Platform.OS = os;
});

it("links the APK for the phone's ABI on Android", async () => {
  Platform.OS = 'android';
  await expect(getLatestRelease()).resolves.toEqual({
    version: '19.0.0',
    url: `${mirror}/learnX-arm64-v19.0.0.apk`,
  });
  expect(fetchMock).toHaveBeenCalledWith(`${mirror}/latest.json`);
});

it('links the Mac zip elsewhere', async () => {
  Platform.OS = 'ios';
  await expect(getLatestRelease()).resolves.toEqual({
    version: '19.0.0',
    url: `${mirror}/learnX-mac-v19.0.0.zip`,
  });
});
