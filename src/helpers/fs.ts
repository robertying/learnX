import {Platform} from 'react-native';
import Share from 'react-native-share';
import fs from 'react-native-fs';
import mime from 'mime-types';
import qs from 'qs';
import {getTranslation} from './i18n';
import {dataSource} from '../redux/dataSource';

export let RNFetchBlob: typeof import('rn-fetch-blob').default;
if (Platform.OS === 'android') {
  RNFetchBlob = require('rn-fetch-blob').default;
}

export const shareFile = async (
  url: string,
  name: string,
  ext: string,
  courseName: string,
) => {
  const filePath = await downloadFile(url, name, ext, courseName);

  await Share.open({
    filename: `${name}.${ext}`,
    url: (Platform.OS === 'android' ? 'file://' : '') + filePath,
    type: mime.lookup(ext) || 'text/plain',
    title: getTranslation('openFile'),
    showAppsToView: true,
    failOnCancel: false,
  });
};

export const fileDir =
  Platform.OS === 'ios'
    ? `file://${fs.DocumentDirectoryPath}/files`
    : `${fs.DocumentDirectoryPath}`;

export const downloadFile = async (
  url: string,
  name: string,
  ext: string,
  courseName: string,
  retry?: boolean,
  onProgress?: (percent: number) => void,
) => {
  const id = url.split('?')[1] ? qs.parse(url.split('?')[1])?.wjid : 'dummy';
  const courseDir = `${fileDir}/${courseName}`;
  const filePath = `${courseDir}/${name}-${id}.${ext}`;

  if (Platform.OS === 'ios') {
    await fs.mkdir(courseDir);

    if ((await fs.exists(filePath)) && !retry) {
      return filePath;
    } else {
      const {promise} = fs.downloadFile({
        fromUrl: url,
        toFile: filePath,
        begin: () => {},
        progress: (result) => {
          onProgress?.(result.bytesWritten / result.contentLength);
        },
      });

      const result = await promise;
      if (result.statusCode !== 200 || result.bytesWritten === 0) {
        throw new Error('File download failed');
      }

      if (result.bytesWritten < 100) {
        const file = await fs.readFile(filePath);
        if (file.includes('location.href')) {
          await dataSource.login();
          throw new Error('File download failed');
        }
      }

      return filePath;
    }
  } else {
    if ((await RNFetchBlob.fs.exists(filePath)) && !retry) {
      return filePath;
    } else {
      await new Promise((resolve, reject) =>
        RNFetchBlob.config({
          path: filePath,
        })
          .fetch('GET', url)
          .progress((received, total) => {
            if (onProgress) {
              onProgress(received / total);
            }
          })
          .then((res) => {
            resolve(res.path());
          })
          .catch((err) => reject(err)),
      );
      return filePath;
    }
  }
};

export const getExtension = (filename: string) => {
  return filename ? filename.split('.').pop() : '';
};

export const stripExtension = (filename: string) => {
  return filename ? filename.replace(/\.[^/.]+$/, '') : '';
};
