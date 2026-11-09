import { ToastAndroid } from 'react-native';
import * as Haptics from 'expo-haptics';

import { toastHaptics, type ToastType } from './Toast.shared';

export type { ToastType } from './Toast.shared';

/**
 * Shows the system toast, which draws above dialogs. The system picks how
 * long it stays (2 or 3.5 seconds), so `duration` only picks between the two.
 * Errors and warnings get the longer one. An empty `text` does nothing: a
 * system toast can't be hidden early.
 */
export const toast = (text: string, type: ToastType, duration?: number) => {
  if (!text) {
    return;
  }
  const long = duration !== undefined ? duration > 3000 : type !== 'success';
  ToastAndroid.show(text, long ? ToastAndroid.LONG : ToastAndroid.SHORT);
  const feedback = toastHaptics[type];
  if (feedback !== undefined) {
    void Haptics.notificationAsync(feedback);
  }
};

/** The system draws toasts on Android; nothing to mount. */
export const Toast: React.FC = () => null;
