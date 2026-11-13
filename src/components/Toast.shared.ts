import type { Haptic } from 'services/haptics';

export type ToastType = 'success' | 'warning' | 'error' | 'none';

export interface ToastOptions {
  /** How long it stays, in milliseconds; each type has a default. */
  duration?: number;
  /**
   * Whether it plays its type's haptic (default true). Turn it off for a
   * toast the user didn't cause, such as a background sync's error, and for
   * one that confirms a gesture that already played its own, like a swipe.
   */
  haptic?: boolean;
}

/** The haptic each kind of toast plays; plain toasts play none. */
export const toastHaptics: Partial<Record<ToastType, Haptic>> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
};

/** The haptic a toast plays, if any. */
export const toastHaptic = (type: ToastType, options?: ToastOptions) =>
  options?.haptic === false ? undefined : toastHaptics[type];
