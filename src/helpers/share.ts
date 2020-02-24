import {Platform} from 'react-native';
import Share from 'react-native-share';
import fs from 'react-native-fs';
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

export const fileDir = `file://${
  Platform.OS === 'ios'
    ? fs.DocumentDirectoryPath
    : `${fs.DownloadDirectoryPath}/learnX`
}/files`;

export const downloadFile = async (
  url: string,
  name: string,
  ext: string,
  courseName: string,
  retry?: boolean,
  onProgress?: (percent: number) => void,
) => {
  const courseDir = `${fileDir}/${courseName}`;
  await fs.mkdir(courseDir);

  const filePath = `${courseDir}/${name}.${ext}`;

  if ((await fs.exists(filePath)) && !retry) {
    return filePath;
  } else {
    const {promise} = fs.downloadFile({
      fromUrl: url,
      toFile: filePath,
      begin: () => {},
      progress: result => {
        onProgress?.(result.bytesWritten / result.contentLength);
      },
    });

    const result = await promise;
    if (result.statusCode !== 200 || result.bytesWritten === 0) {
      throw new Error('File download failed');
    }

    return filePath;
  }
};

export const getExtension = (filename: string) => {
  return filename ? filename.split('.').pop() : '';
};

export const stripExtension = (filename: string) => {
  return filename ? filename.replace(/\.[^/.]+$/, '') : '';
};
