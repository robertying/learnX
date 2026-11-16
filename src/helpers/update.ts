import DeviceInfo from 'constants/DeviceInfo';
import env from 'helpers/env';

const tunaMirrorUrl =
  'https://mirrors.tuna.tsinghua.edu.cn/github-release/robertying/learnX/LatestRelease';

/**
 * Where E2E builds look for updates instead: `scripts/updater-e2e-server.mjs`,
 * through `adb reverse` (`scripts/e2e-updater.sh`).
 */
export const E2E_UPDATE_URL = 'http://localhost:8198';

/**
 * Where releases are published: the TUNA mirror of GitHub Releases, which has
 * `latest.json` and the APKs fastlane's Android build makes.
 */
export const updateFeedUrl = () =>
  env.TEST_LOGIN ? E2E_UPDATE_URL : tunaMirrorUrl;

interface LatestJson {
  version: string;
  /** The APKs, with the SHA-256 (hex) of each. */
  files?: { name: string; sha256: string; size?: number }[];
}

export interface Release {
  version: string;
  /** The APK for this phone's ABI. */
  url: string;
  /** Its SHA-256 (hex), when `latest.json` lists it. */
  sha256?: string;
  /** Its size in bytes, when `latest.json` lists it. */
  size?: number;
}

/**
 * The latest Android release on the mirror: its version and the APK for this
 * phone's ABI. Only the APKs check it (`hooks/useAvailableUpdate`).
 */
export const getLatestRelease = async (): Promise<Release> => {
  const feed = updateFeedUrl();
  const response = await fetch(`${feed}/latest.json`);
  if (!response.ok) {
    throw new Error(`Mirror answered ${response.status}`);
  }
  const { version, files } = (await response.json()) as LatestJson;
  const name = `learnX-${DeviceInfo.abi()}-v${version}.apk`;
  const file = files?.find(entry => entry.name === name);
  return {
    version,
    url: `${feed}/${name}`,
    sha256: file?.sha256,
    size: file?.size,
  };
};
