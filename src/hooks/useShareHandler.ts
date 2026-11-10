import { useEffect, useEffectEvent } from 'react';
import { Platform } from 'react-native';
import Share, { type SharedItem } from '../../modules/share';
import { t } from 'helpers/i18n';
import { copyFileToCache } from 'helpers/files/share';
import { toast } from 'components/Toast';
import { setPendingAssignmentData } from 'data/pendingAssignment';

/**
 * Keeps a file shared to learnX, at launch or while running, so that it can be
 * attached to an assignment submission.
 */
const useShareHandler = () => {
  const handleShare = useEffectEvent(async (item: SharedItem) => {
    if (item.kind === 'unsupported') {
      toast(t('shareUnsupported'), 'error', 3 * 1000);
      return;
    }

    let uri = item.uri;
    // Android hands over a content URI that may stop working once the sharing
    // app is done; iOS's share extension already copied the file to the app
    // group.
    if (Platform.OS === 'android') {
      try {
        uri = await copyFileToCache(uri);
      } catch {
        toast(t('shareError'), 'error', 3 * 1000);
        return;
      }
    }

    setPendingAssignmentData({ data: uri, mimeType: item.mimeType });
    toast(t('shareReceived'), 'success', 5 * 1000);
  });

  useEffect(() => {
    if (!Share) {
      return;
    }
    const initial = Share.takeSharedItem();
    if (initial) {
      void handleShare(initial);
    }
    const sub = Share.addListener('onShare', item => {
      void handleShare(item);
    });
    return () => sub.remove();
  }, []);
};

export default useShareHandler;
