import DeviceInfo from '../constants/DeviceInfo';
import {Platform} from 'react-native';

export const getLatestRelease = async () => {
  const response = await fetch(
    'https://app.robertying.io/download/learnX/latest.json',
  );
  const json = await response.json();
  const version = json.version as string;

  if (Platform.OS === 'android') {
    const url = `https://app.robertying.io/download/learnX/learnX-${DeviceInfo.abi()}-v${version}.apk`;

    return {
      version,
      url,
    };
  } else {
    const url = `https://app.robertying.io/download/learnX/learnX-mac-v${version}.zip`;

    return {
      version,
      url,
    };
  }
};
