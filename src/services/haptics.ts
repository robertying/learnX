// The app's haptics, by what they mean. iOS plays UIKit's feedback generators
// (which do nothing on iPad and Mac, so those need no check here); Android
// plays the system's own `HapticFeedbackConstants` through the content view,
// so they follow the system's touch feedback setting and feel like the rest
// of the system. Native controls (switches on iOS, pickers, context menus,
// pull to refresh) play their own or none, so only gestures and outcomes the
// app draws itself call this.
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export type Haptic =
  /** A task the user started finished (submitted, saved, exported). */
  | 'success'
  /** A task the user started didn't do what they asked, without failing. */
  | 'warning'
  /** A task the user started failed. */
  | 'error'
  /** A swipe crossed the point where letting go runs its action. */
  | 'threshold'
  /** A swipe went back under that point. */
  | 'thresholdRelease'
  /** A long press opened something (Android's card menu). */
  | 'longPress'
  /** A row lifted to be dragged. */
  | 'dragStart'
  /** A dragged row moved past another. */
  | 'dragTick'
  /** A switch the app draws itself turned on or off (Android's Compose switch). */
  | 'toggleOn'
  | 'toggleOff';

const {
  AndroidHaptics: A,
  ImpactFeedbackStyle,
  NotificationFeedbackType,
} = Haptics;

const ios: Record<Haptic, (() => Promise<void>) | null> = {
  success: () => Haptics.notificationAsync(NotificationFeedbackType.Success),
  warning: () => Haptics.notificationAsync(NotificationFeedbackType.Warning),
  error: () => Haptics.notificationAsync(NotificationFeedbackType.Error),
  threshold: () => Haptics.impactAsync(ImpactFeedbackStyle.Medium),
  thresholdRelease: () => Haptics.impactAsync(ImpactFeedbackStyle.Light),
  longPress: () => Haptics.impactAsync(ImpactFeedbackStyle.Medium),
  dragStart: () => Haptics.impactAsync(ImpactFeedbackStyle.Medium),
  dragTick: () => Haptics.selectionAsync(),
  // UISwitch plays its own.
  toggleOn: null,
  toggleOff: null,
};

/**
 * Each meaning's constant, then a fallback for older Android versions: the
 * newer constants throw below the API level that added them. Android has no
 * warning constant; a warning is a request that wasn't carried out, which is
 * what REJECT means.
 */
const android: Record<Haptic, [api: number, Haptics.AndroidHaptics][]> = {
  success: [[30, A.Confirm]],
  warning: [[30, A.Reject]],
  error: [[30, A.Reject]],
  threshold: [
    [34, A.Segment_Tick],
    [0, A.Clock_Tick],
  ],
  thresholdRelease: [
    [34, A.Segment_Tick],
    [0, A.Clock_Tick],
  ],
  longPress: [[0, A.Long_Press]],
  dragStart: [
    [34, A.Drag_Start],
    [0, A.Long_Press],
  ],
  dragTick: [
    [34, A.Segment_Frequent_Tick],
    [0, A.Clock_Tick],
  ],
  toggleOn: [
    [34, A.Toggle_On],
    [0, A.Clock_Tick],
  ],
  toggleOff: [
    [34, A.Toggle_Off],
    [0, A.Clock_Tick],
  ],
};

/** Android 9 and 10 have no CONFIRM or REJECT: play the old vibrations. */
const androidLegacy: Partial<Record<Haptic, Haptics.NotificationFeedbackType>> =
  {
    success: NotificationFeedbackType.Success,
    warning: NotificationFeedbackType.Warning,
    error: NotificationFeedbackType.Error,
  };

const play = (haptic: Haptic): Promise<void> | undefined => {
  if (Platform.OS === 'ios') {
    return ios[haptic]?.();
  }
  if (Platform.OS === 'android') {
    const api = Platform.Version;
    const constant = android[haptic].find(([since]) => api >= since)?.[1];
    if (constant) {
      return Haptics.performAndroidHapticsAsync(constant);
    }
    const legacy = androidLegacy[haptic];
    return legacy ? Haptics.notificationAsync(legacy) : undefined;
  }
  return undefined;
};

/**
 * Plays a haptic. Fire and forget: a device without haptics, or one that
 * can't play this one, stays silent. Safe to call through `runOnJS`.
 */
export const playHaptic = (haptic: Haptic) => {
  play(haptic)?.catch(() => {});
};
