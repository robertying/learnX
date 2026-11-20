import { nativeApplicationVersion } from 'expo-application';
import semverGt from 'semver/functions/gt';
import semverValid from 'semver/functions/valid';
import DeviceInfo from 'constants/DeviceInfo';
import updateMirror from 'constants/updateMirror.json';
import env from 'helpers/env';

// Where the APKs learn of a new version (`latest.json` on the release mirror),
// and whether it's newer than the installed app.

/**
 * The TUNA mirror's copy of the latest GitHub release, which the Electron
 * app updates from too (electron/packageConfig.ts reads the same file).
 */
const tunaMirrorUrl = updateMirror.latestRelease;

/**
 * Where E2E builds look for updates instead: `scripts/e2e/updater-e2e-server.mjs`,
 * through `adb reverse` (`scripts/e2e/e2e-updater.sh`).
 */
export const E2E_UPDATE_URL = 'http://localhost:8198';

/**
 * Where releases are published: the TUNA mirror of GitHub Releases, which has
 * `latest.json` and the APKs fastlane's Android build makes.
 */
const updateFeedUrl = () => (env.TEST_LOGIN ? E2E_UPDATE_URL : tunaMirrorUrl);

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
  // Without cookies: the mirror needs none, and the app's requests share a
  // cookie store with Tsinghua's sites.
  const response = await fetch(`${feed}/latest.json`, { credentials: 'omit' });
  if (!response.ok) {
    throw new Error(`Mirror answered ${response.status}`);
  }
  const { version, files } = (await response.json()) as LatestJson;
  // Compared with the installed version as it renders: a version semver
  // can't read would throw there.
  if (typeof version !== 'string' || !semverValid(version)) {
    throw new Error(`Mirror gave no version: ${String(version)}`);
  }
  const name = `learnX-${DeviceInfo.abi()}-v${version}.apk`;
  const file = files?.find(entry => entry.name === name);
  return {
    version,
    url: `${feed}/${name}`,
    sha256: file?.sha256,
    size: file?.size,
  };
};

/**
 * Whether `release` is newer than the installed app: its own version, not
 * the JS bundle's, which an over-the-air update can change.
 */
export const isNewerRelease = (release: Pick<Release, 'version'>) =>
  !!nativeApplicationVersion &&
  semverGt(release.version, nativeApplicationVersion);
