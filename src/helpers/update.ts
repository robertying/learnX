import { Platform } from 'react-native';
import DeviceInfo from 'constants/DeviceInfo';

const tunaMirrorUrl =
  'https://mirrors.tuna.tsinghua.edu.cn/github-release/robertying/learnX/LatestRelease';

export const getLatestRelease = async () => {
  const response = await fetch(`${tunaMirrorUrl}/latest.json`);
  const json = await response.json();
  const version = json.version as string;

  if (Platform.OS === 'android') {
    const url = `${tunaMirrorUrl}/learnX-${await DeviceInfo.abi()}-v${version}.apk`;

    return {
      version,
      url,
    };
  } else {
    const url = `${tunaMirrorUrl}/learnX-mac-v${version}.zip`;

    return {
      version,
      url,
    };
  }
};
