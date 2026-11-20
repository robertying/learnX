import { Alert } from 'react-native';
import type { Release } from 'services/updateFeed';
import { t } from 'helpers/i18n';
import type { UpdateStep } from 'services/update';
import { installUpdate, pendingUpdate } from 'services/electronUpdates';

/**
 * Installs the Electron app's update from the update row in Settings: it has
 * already downloaded, so this asks to restart (with a button for the
 * changelog when `onViewChangelog` is given) and quits into the installer,
 * which opens learnX again. Without it, the update installs when learnX quits.
 * A .deb doesn't install updates itself: this opens the downloaded one in the
 * system's installer instead.
 */
const useUpdateInstaller = (
  release: Release | null,
  { onViewChangelog }: { onViewChangelog?: () => void } = {},
) => {
  const update = () => {
    if (!release) {
      return;
    }
    const changelog = onViewChangelog
      ? [{ text: t('viewChangelog'), onPress: onViewChangelog }]
      : [];
    if (pendingUpdate()?.opensInstaller) {
      Alert.alert(
        t('updateTitle', { version: release.version }),
        t('updateDebMessage'),
        [
          { text: t('cancel'), style: 'cancel' },
          { text: t('open'), onPress: installUpdate },
          ...changelog,
        ],
      );
      return;
    }
    Alert.alert(
      t('updateTitle', { version: release.version }),
      t('updateRestartMessage'),
      [
        { text: t('cancel'), style: 'cancel' },
        // First, so the dialog makes it the primary button.
        { text: t('restart'), onPress: installUpdate },
        ...changelog,
      ],
    );
  };

  return { update, step: null as UpdateStep | null, progress: 0 };
};

export default useUpdateInstaller;
