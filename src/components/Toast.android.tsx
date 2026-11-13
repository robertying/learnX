import { ToastAndroid } from 'react-native';
import { playHaptic } from 'services/haptics';
import { toastHaptic, type ToastOptions, type ToastType } from './Toast.shared';

export type { ToastOptions, ToastType } from './Toast.shared';

/**
 * Shows the system toast, which draws above dialogs. The system picks how
 * long it stays (2 or 3.5 seconds), so `duration` only picks between the two.
 * Errors and warnings get the longer one. An empty `text` does nothing: a
 * system toast can't be hidden early.
 */
export const toast = (
  text: string,
  type: ToastType,
  options?: ToastOptions,
) => {
  if (!text) {
    return;
  }
  const duration = options?.duration;
  const long = duration !== undefined ? duration > 3000 : type !== 'success';
  ToastAndroid.show(text, long ? ToastAndroid.LONG : ToastAndroid.SHORT);
  const haptic = toastHaptic(type, options);
  if (haptic) {
    playHaptic(haptic);
  }
};

/** The system draws toasts on Android; nothing to mount. */
export const Toast: React.FC = () => null;
