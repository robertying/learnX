import * as Haptics from 'expo-haptics';

export type ToastType = 'success' | 'warning' | 'error' | 'none';

/** The haptic each kind of toast plays; plain toasts play none. */
export const toastHaptics: Partial<
  Record<ToastType, Haptics.NotificationFeedbackType>
> = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
};
