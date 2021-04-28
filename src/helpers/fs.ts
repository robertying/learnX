import * as ExpoFileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import fs from 'react-native-fs';
import Share from 'react-native-share';
import mime from 'mime-types';
import {dataSource} from 'data/source';
import {store} from 'data/store';
import {File} from 'data/types/state';
import {Platform} from 'react-native';

export const downloadFile = async (
  file: File,
  refresh?: boolean,
  onProgress?: (progress: number) => void,
) => {
  let dir = `${
    store.getState().settings.fileUseDocumentDir
      ? ExpoFileSystem.documentDirectory
      : ExpoFileSystem.cacheDirectory
  }learnX-files/${file.courseName}/${file.id}`;
  if (Platform.OS === 'android') {
    dir = encodeURI(dir);
  }
  await fs.mkdir(dir);

  let path = `${dir}/${file.courseName}-${file.title}${
    file.fileType ? `.${file.fileType}` : ''
  }`;

  if (Platform.OS === 'android') {
    path = encodeURI(path);
  }

  if (!refresh && (await fs.exists(path))) {
    return path;
  }

  if (
    !file.downloadUrl.startsWith('http://') &&
    !file.downloadUrl.startsWith('https://')
  ) {
    throw new Error('Invalid file url');
  }

  if (Platform.OS === 'ios') {
    const downloadPromise = fs.downloadFile({
      fromUrl: file.downloadUrl,
      toFile: path,
      begin: () => {},
      progress: (result) => {
        onProgress?.(result.bytesWritten / result.contentLength);
      },
    });

    const result = await downloadPromise.promise;
    if (result.statusCode !== 200 || result.bytesWritten === 0) {
      try {
        await fs.unlink(path);
      } catch {}

      throw new Error('File download failed');
    }

    if (result.bytesWritten < 100) {
      const file = await fs.readFile(path);

      if (file.includes('location.href')) {
        try {
          await fs.unlink(path);
        } catch {}

        await dataSource.login();

        throw new Error('File download failed');
      }
    }
  } else {
    const downloadResumable = ExpoFileSystem.createDownloadResumable(
      file.downloadUrl,
      path,
      {},
      (result) => {
        onProgress?.(
          result.totalBytesWritten / result.totalBytesExpectedToWrite,
        );
      },
    );

    const result = await downloadResumable.downloadAsync();
    if (!result || result.status !== 200) {
      try {
        await fs.unlink(path);
      } catch {}

      throw new Error('File download failed');
    }

    const downloadedFile = await ExpoFileSystem.getInfoAsync(path);
    if (downloadedFile.size && downloadedFile.size < 100) {
      const file = await fs.readFile(path);
      if (file.includes('location.href')) {
        try {
          await fs.unlink(path);
        } catch {}

        await dataSource.login();

        throw new Error('File download failed');
      }
    }
  }

  return path;
};

export const shareFile = async (file: File) => {
  const path = await downloadFile(file, false);

  await Share.open({
    filename: `${file.title}.${file.fileType}`,
    url: path,
    type: (file.fileType && mime.lookup(file.fileType)) || 'text/plain',
    title: '分享文件',
    message: `分享 ${file.title}`,
    showAppsToView: true,
    failOnCancel: false,
  });
};

export const removeFileDir = async () => {
  const dir = `${
    store.getState().settings.fileUseDocumentDir
      ? ExpoFileSystem.documentDirectory
      : ExpoFileSystem.cacheDirectory
  }learnX-files`;

  if (await fs.exists(dir)) {
    await fs.unlink(dir);
  }
};

export const openFile = async (uri: string, type?: string | null) => {
  const contentUri = await ExpoFileSystem.getContentUriAsync(uri);
  IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    type: (type && mime.lookup(type)) || 'text/plain',
    data: contentUri,
    flags: 1,
  });
};

export const getExtension = (filename: string) => {
  return filename ? filename.split('.').pop() : '';
};

export const stripExtension = (filename: string) => {
  return filename ? filename.replace(/\.[^/.]+$/, '') : '';
};
