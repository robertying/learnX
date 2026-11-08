import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { toast } from 'components/Toast';
import { useSettings } from 'data/settings';
import { DownloadableFile } from 'data/types/state';
import {
  copyFileToMacDownloads,
  downloadFile,
  openFile,
  shareFile,
} from 'helpers/fs';
import { t } from 'helpers/i18n';

/**
 * Downloads a file on mount (from the cache when it is there) and offers
 * re-download, share, copy to the Mac Downloads folder and open. On Android
 * a non-PDF opens by itself after the download when the setting is on.
 *
 * Only the file given on first render is used: FileDetail remounts its
 * content when the download fields change.
 */
const useFileDownload = (file: DownloadableFile) => {
  const openFileAfterDownload = useSettings(
    settings => settings.openFileAfterDownload,
  );

  const [path, setPath] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(false);

  const [downloadable] = useState<DownloadableFile>(() => ({
    id: file.id,
    courseName: file.courseName,
    title: file.title,
    fileType: file.fileType,
    downloadUrl: file.downloadUrl,
  }));

  const download = useCallback(
    (refresh: boolean) =>
      downloadFile(downloadable, refresh, setProgress).then(
        downloadedPath => {
          setPath(downloadedPath);
          setProgress(0);
        },
        () => {
          setProgress(0);
          setError(true);
          toast(t('fileDownloadFailed'), 'error');
        },
      ),
    [downloadable],
  );

  /** Downloads again, past the cache */
  const redownload = useCallback(() => {
    setPath('');
    setError(false);
    void download(true);
  }, [download]);

  const share = useCallback(async () => {
    await shareFile(downloadable);
  }, [downloadable]);

  const copyToDownloads = useCallback(async () => {
    try {
      await copyFileToMacDownloads(downloadable, path);
      toast(t('downloadToDownloadsSucceeded'), 'success');
    } catch {
      toast(t('downloadToDownloadsFailed'), 'error');
    }
  }, [path, downloadable]);

  const open = useCallback(async () => {
    try {
      if (Platform.OS === 'android') {
        await openFile(path, downloadable.fileType);
      } else {
        await Linking.openURL(path);
      }
    } catch {
      toast(t('openFileFailed'), 'error');
    }
  }, [downloadable.fileType, path]);

  useEffect(() => {
    void download(false);
  }, [download]);

  const openAfterDownload = useEffectEvent(() => {
    if (
      Platform.OS === 'android' &&
      openFileAfterDownload &&
      downloadable.fileType !== 'pdf'
    ) {
      void open();
    }
  });

  useEffect(() => {
    if (path) {
      openAfterDownload();
    }
  }, [path]);

  return { path, progress, error, redownload, share, copyToDownloads, open };
};

export default useFileDownload;
