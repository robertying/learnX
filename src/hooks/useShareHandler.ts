import { useEffect, useEffectEvent } from 'react';
import { Platform } from 'react-native';
import ShareMenu, { type ShareData } from 'react-native-share-menu';
import { t } from 'helpers/i18n';
import { copyFileToCache } from 'helpers/files/share';
import { toast } from 'components/Toast';
import {
  PendingAssignmentData,
  setPendingAssignmentData,
} from 'data/pendingAssignment';

/**
 * Keeps a file shared to learnX, at launch or while running, so that it can be
 * attached to an assignment submission.
 */
const useShareHandler = () => {
  const handleShare = useEffectEvent(async (item?: ShareData) => {
    if (!item) {
      return;
    }

    let shared: PendingAssignmentData;
    if (Platform.OS === 'ios') {
      // On iOS `data` is the list of shared files, not the strings its
      // types say.
      const files = item.data as unknown as PendingAssignmentData[];
      if (!Array.isArray(files) || files.length === 0) {
        return;
      }
      shared = files[0];
    } else {
      // Android hands over a content URI that may stop working later.
      try {
        shared = {
          mimeType: item.mimeType,
          data: await copyFileToCache(String(item.data)),
        };
      } catch {
        toast(t('shareError'), 'error', 3 * 1000);
        return;
      }
    }

    setPendingAssignmentData(shared);
    toast(t('shareReceived'), 'success', 5 * 1000);
  });

  useEffect(() => {
    ShareMenu.getInitialShare(item => handleShare(item));
    const sub = ShareMenu.addNewShareListener(item => handleShare(item));
    return () => sub.remove();
  }, []);
};

export default useShareHandler;
