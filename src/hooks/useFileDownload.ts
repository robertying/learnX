import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { toast } from 'components/Toast';
import { useSettings } from 'data/settings';
import { DownloadableFile } from 'data/types/state';
import { downloadFile } from 'services/files/downloads';
import { saveFileOnMac, openFile, shareFile } from 'services/files/share';
import { fileNameOf } from 'helpers/filename';
import { t } from 'helpers/i18n';
import { isAndroid, isElectron } from 'helpers/platform';

/**
 * The Electron app's file actions (services/files/electron), required only
 * there, so the phones' bundles leave them out; null elsewhere.
 */
const electron = () =>
  isElectron()
    ? (require('services/files/electron') as typeof import('services/files/electron'))
    : null;

/**
 * Downloads a file on mount (from the cache when it is there) and offers
 * re-download, share, save where people pick (Mac, Electron) and open
 * (Android, Electron). The Electron app also shows the file in its folder.
 * On Android a non-PDF opens by itself after the
 * download when the setting is on.
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
    courseId: file.courseId,
    courseName: file.courseName,
    title: file.title,
    fileType: file.fileType,
    downloadUrl: file.downloadUrl,
  }));

  // The download under way, cancelled when another starts or the screen
  // closes.
  const downloadRef = useRef<AbortController | null>(null);

  const download = (refresh: boolean) => {
    downloadRef.current?.abort();
    const controller = new AbortController();
    downloadRef.current = controller;
    return downloadFile(downloadable, {
      refresh,
      onProgress: setProgress,
      signal: controller.signal,
    }).then(
      downloadedPath => {
        setPath(downloadedPath);
        setProgress(0);
      },
      () => {
        if (controller.signal.aborted) {
          return;
        }
        setProgress(0);
        setError(true);
        toast(t('fileDownloadFailed'), 'error');
      },
    );
  };

  /** Downloads again, past the cache */
  const redownload = () => {
    setPath('');
    setError(false);
    void download(true);
  };

  const share = async () => {
    try {
      await shareFile(downloadable);
    } catch {
      toast(t('fileDownloadFailed'), 'error');
    }
  };

  const save = async () => {
    try {
      const actions = electron();
      const saved = actions
        ? await actions.saveFileAs(downloadable, path)
        : await saveFileOnMac(downloadable, path);
      if (saved) {
        toast(
          t('saveFileSucceeded', { name: fileNameOf(downloadable) }),
          'success',
        );
      }
    } catch {
      toast(t('saveFileFailed'), 'error');
    }
  };

  /**
   * Opens the file in another app (Android) or its default app (Electron);
   * Apple platforms share it.
   */
  const open = async () => {
    try {
      const actions = electron();
      if (actions) {
        await actions.openInDefaultApp(path);
      } else {
        await openFile(path, downloadable.fileType);
      }
    } catch {
      toast(t('openFileFailed'), 'error');
    }
  };

  /** Shows the downloaded file in the file manager (Electron). */
  const showInFolder = () => {
    electron()
      ?.showInFolder(path)
      .catch(() => toast(t('openFileFailed'), 'error'));
  };

  const downloadOnMount = useEffectEvent(() => {
    void download(false);
  });

  useEffect(() => {
    downloadOnMount();
    return () => downloadRef.current?.abort();
  }, []);

  const openAfterDownload = useEffectEvent(() => {
    if (
      isAndroid() &&
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

  return {
    path,
    progress,
    error,
    redownload,
    share,
    save,
    open,
    showInFolder,
  };
};

export default useFileDownload;
