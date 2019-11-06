import {Platform} from 'react-native';
import Share from 'react-native-share';
import RNFetchBlob from 'rn-fetch-blob';
import {getTranslation} from './i18n';

export const supportedFileTypes = [
  'pdf',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'xls',
  'xlsx',
  'zip',
  'rar',
];
export const mimeTypes: any = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx:
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx:
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip: 'application/zip',
  rar: 'application/x-rar-compressed',
};

export const shareFile = (url: string, name: string, ext: string) => {
  return new Promise<boolean>(async (resolve, reject) => {
    if (!supportedFileTypes.includes(ext.toLowerCase())) {
      reject('Unsupported file type');
    }

    const filePath = await downloadFile(url, name, ext).catch(() =>
      reject('Download failed'),
    );

    if (filePath) {
      Share.open({
        url: Platform.OS === 'android' ? 'file://' + filePath : filePath,
        type: mimeTypes[ext],
        title: getTranslation('openFile'),
        showAppsToView: true,
      });

      resolve(true);
    }
  });
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
  return filename.replace(/\.[^/.]+$/, '');
};
