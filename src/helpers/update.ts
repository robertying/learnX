import DeviceInfo from '../constants/DeviceInfo';
import {Platform} from 'react-native';

const tunaMirrorUrl =
  'https://mirrors.tuna.tsinghua.edu.cn/github-release/robertying/learnX/LatestRelease';

export const getLatestRelease = async () => {
  const response = await fetch(`${tunaMirrorUrl}/latest.json`);
  const json = await response.json();
  const version = json.version as string;

  if (Platform.OS === 'android') {
    const url = `${tunaMirrorUrl}/learnX-${DeviceInfo.abi()}-v${version}.apk`;

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

export const getReleaseNote = async (version: string) => {
  const response = await fetch(
    `https://api.github.com/repos/robertying/learnX/releases/tags/v${version}`,
  );
  const json = await response.json();
  const body = json.body as string;
  return body;
};
