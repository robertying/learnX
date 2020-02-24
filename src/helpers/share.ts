import {Platform} from 'react-native';
import Share from 'react-native-share';
import mime from 'mime-types';
import {getTranslation} from './i18n';

export const shareFile = async (
  url: string,
  name: string,
  ext: string,
  courseName: string,
) => {
  const filePath = await downloadFile(url, name, ext, courseName);

  const mimeType = mime.lookup(ext);
  if (mimeType) {
    await Share.open({
      filename: `${name}.${ext}`,
      url: filePath,
      type: mimeType,
        title: getTranslation('openFile'),
        showAppsToView: true,
      failOnCancel: false,
      });
  } else {
    throw new Error('File format not supported');
    }
};

export const downloadFile = (
  url: string,
  name: string,
  ext: string,
  retry?: boolean,
  onProgress?: (percent: number) => void,
) => {
  return new Promise<string>(async (resolve, reject) => {
    const dirs = RNFetchBlob.fs.dirs;
    const filePath = `${dirs.DocumentDir}/files/${name}.${ext}`;
    const exists = await RNFetchBlob.fs.exists(filePath);

    if (retry || !exists) {
      RNFetchBlob.config({
        path: filePath,
      })
        .fetch('GET', url)
        .progress((received, total) => {
          if (onProgress) {
            onProgress(received / total);
          }
        })
        .then(res => {
          const status = res.respInfo.status;
          if (status !== 200) {
            reject();
          } else {
            resolve(res.path());
          }
        })
        .catch(() => reject());
    } else {
      resolve(filePath);
    }
  });
};

export const getExtension = (filename: string) => {
  return filename ? filename.split('.').pop() : '';
};

export const stripExtension = (filename: string) => {
  return filename ? filename.replace(/\.[^/.]+$/, '') : '';
};
