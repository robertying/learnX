import { useState } from 'react';
import { Alert } from 'react-native';
import { queryClient } from 'data/queryClient';
import { latestReleaseQuery } from 'data/latestRelease';
import type { Release } from 'services/updateFeed';
import { formatFileSize } from 'helpers/filename';
import { t, type TextKey } from 'helpers/i18n';
import { openLink } from 'helpers/openLink';
import {
  installsUpdate,
  installUpdate,
  needsInstallPermission,
  type UpdateFailure,
  type UpdateStep,
} from 'services/update';

const failureMessages: Record<
  Exclude<UpdateFailure, 'ERR_UPDATE_CANCELLED'>,
  TextKey
> = {
  ERR_UPDATE_DOWNLOAD: 'updateDownloadFailed',
  ERR_UPDATE_CHECKSUM: 'updateVerifyFailed',
  ERR_UPDATE_SIGNATURE: 'updateVerifyFailed',
  ERR_UPDATE_NOT_ALLOWED: 'updateNotAllowed',
  ERR_UPDATE_FAILED: 'updateInstallFailed',
};

/**
 * `latest.json` again, not the copy kept for a few hours: after a failure, the
 * mirror may have been between a release's files.
 */
const freshRelease = (current: Release) =>
  queryClient
    .fetchQuery({ ...latestReleaseQuery, staleTime: 0 })
    .catch(() => current);

const failureOf = (error: unknown): UpdateFailure =>
  (error as { code?: UpdateFailure } | null)?.code ?? 'ERR_UPDATE_FAILED';

/**
 * Updates the Android app to `release` from the update row in Settings: asks
 * first (with the download's size, that Android will ask to allow installing
 * apps if it hasn't, and a button for the changelog when `onViewChangelog` is
 * given), then downloads and installs it (`services/update`), and on failure
 * offers to try again (with `latest.json` read again) or to download the APK
 * in the browser. Builds that can't install (Google Play's) open the APK in
 * the browser. `step` and `progress` are for the row to show.
 */
const useUpdateInstaller = (
  release: Release | null,
  { onViewChangelog }: { onViewChangelog?: () => void } = {},
) => {
  const [step, setStep] = useState<UpdateStep | null>(null);
  const [progress, setProgress] = useState(0);

  const run = (target: Release) => {
    setProgress(0);
    setStep('downloading');
    installUpdate(target, { onStep: setStep, onProgress: setProgress })
      .catch((error: unknown) => {
        const failure = failureOf(error);
        if (failure !== 'ERR_UPDATE_CANCELLED') {
          Alert.alert(t('updateFailed'), t(failureMessages[failure]), [
            { text: t('cancel'), style: 'cancel' },
            { text: t('openInBrowser'), onPress: () => openLink(target.url) },
            {
              text: t('tryAgain'),
              onPress: () => {
                void freshRelease(target).then(run);
              },
            },
          ]);
        }
      })
      .finally(() => setStep(null));
  };

  const update = () => {
    if (!release || step) {
      return;
    }
    if (!installsUpdate(release)) {
      openLink(release.url);
      return;
    }
    const message = [
      release.size
        ? t('updateDownloadsSize', { size: formatFileSize(release.size) })
        : t('updateDownloads'),
      needsInstallPermission() ? t('updateAllowInstall') : '',
    ]
      .filter(Boolean)
      .join('\n\n');
    Alert.alert(t('updateTitle', { version: release.version }), message, [
      { text: t('cancel'), style: 'cancel' },
      ...(onViewChangelog
        ? [{ text: t('viewChangelog'), onPress: onViewChangelog }]
        : []),
      { text: t('update'), onPress: () => run(release) },
    ]);
  };

  return { update, step, progress };
};

export default useUpdateInstaller;
