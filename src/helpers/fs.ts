import {Platform} from 'react-native';
import * as ExpoFileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import fs from 'react-native-fs';
import Share from 'react-native-share';
import ShareMenu from 'react-native-share-menu';
import mime from 'mime-types';
import {addCSRF, dataSource} from 'data/source';
import {store} from 'data/store';
import {File} from 'data/types/state';

export const downloadFile = async (
  file: File,
  refresh?: boolean,
  onProgress?: (progress: number) => void,
) => {
  let url = file.downloadUrl;
  if (url.startsWith('file://') || url.startsWith('content://')) {
    return url;
  }

  const settings = store.getState().settings;

  let dir = `${
    settings.fileUseDocumentDir
      ? ExpoFileSystem.documentDirectory
      : ExpoFileSystem.cacheDirectory
  }learnX-files/${file.courseName}/${file.id}`;
  await fs.mkdir(dir);

  let path = settings.fileOmitCourseName
    ? `${dir}/${file.title}${file.fileType ? `.${file.fileType}` : ''}`
    : `${dir}/${file.courseName}-${file.title}${
        file.fileType ? `.${file.fileType}` : ''
      }`;

  if (!refresh && (await fs.exists(path))) {
    return path;
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error('Invalid file url');
  }

  if (refresh) {
    await dataSource.login();
  }
  url = addCSRF(url);

  if (Platform.OS === 'ios') {
    const downloadPromise = fs.downloadFile({
      fromUrl: url,
      toFile: path,
      begin: () => {},
      progress: result => {
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

        throw new Error('File download failed');
      }
    }
  } else {
    const downloadResumable = ExpoFileSystem.createDownloadResumable(
      url,
      path,
      {
        cache: !refresh,
      },
      result => {
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
    if (!downloadedFile.exists) {
      throw new Error('File download failed');
    }
    if (downloadedFile.size && downloadedFile.size < 100) {
      const file = await fs.readFile(path);
      if (file.includes('location.href')) {
        try {
          await fs.unlink(path);
        } catch {}

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
    type:
      (file.fileType && mime.lookup(file.fileType)) ||
      'application/octet-stream',
    title: '分享文件',
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

  if (Platform.OS === 'ios') {
    ShareMenu.getSharedCacheDirectory(async dir => {
      if (dir && (await fs.exists(dir))) {
        await fs.unlink(dir);
      }
    });
  }
};

export const openFile = async (uri: string, type?: string | null) => {
  const contentUri = uri.startsWith('content://')
    ? uri
    : await ExpoFileSystem.getContentUriAsync(uri);
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    type: (type && mime.lookup(type)) || 'application/octet-stream',
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
