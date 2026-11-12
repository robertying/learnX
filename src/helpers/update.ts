import DeviceInfo from 'constants/DeviceInfo';

const tunaMirrorUrl =
  'https://mirrors.tuna.tsinghua.edu.cn/github-release/robertying/learnX/LatestRelease';

/**
 * The latest Android release on the TUNA mirror: its version and the APK for
 * this phone's ABI. Only Android installs from the mirror
 * (`hooks/useAvailableUpdate`).
 */
export const getLatestRelease = async () => {
  const response = await fetch(`${tunaMirrorUrl}/latest.json`);
  if (!response.ok) {
    throw new Error(`Mirror answered ${response.status}`);
  }
  const { version } = (await response.json()) as { version: string };
  return {
    version,
    url: `${tunaMirrorUrl}/learnX-${DeviceInfo.abi()}-v${version}.apk`,
  };
};
