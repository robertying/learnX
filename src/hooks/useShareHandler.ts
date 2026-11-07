import { useEffect, useEffectEvent } from 'react';
import { Platform } from 'react-native';
import ShareMenu from 'react-native-share-menu';
import { t } from 'helpers/i18n';
import { copyFileToCache } from 'helpers/fs';
import { toast } from 'components/Toast';
import { setPendingAssignmentData } from 'data/pendingAssignment';

/**
 * Keeps a file shared to learnX, at launch or while running, so that it can be
 * attached to an assignment submission.
 */
const useShareHandler = () => {
  const handleShare = useEffectEvent(async (item: any) => {
    if (!item) {
      return;
    }

    let data: any = null;
    if (Platform.OS === 'ios') {
      if (!Array.isArray(item.data) || item.data.length === 0) {
        return;
      }
      data = item.data[0];
    } else {
      data = item;
      try {
        data.data = await copyFileToCache(data.data);
      } catch {
        toast(t('shareError'), 'error', 3 * 1000);
        return;
      }
    }

    if (data) {
      setPendingAssignmentData(data);
      toast(t('shareReceived'), 'success', 5 * 1000);
    }
  });

  useEffect(() => {
    ShareMenu.getInitialShare(item => handleShare(item));
    const sub = ShareMenu.addNewShareListener(item => handleShare(item));
    return () => sub.remove();
  }, []);
};

export default useShareHandler;
