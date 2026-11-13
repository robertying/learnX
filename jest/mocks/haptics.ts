export const NotificationFeedbackType = {
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
};
export const ImpactFeedbackStyle = {
  Light: 'light',
  Medium: 'medium',
  Heavy: 'heavy',
  Soft: 'soft',
  Rigid: 'rigid',
};
export const AndroidHaptics = {
  Confirm: 'confirm',
  Reject: 'reject',
  Toggle_On: 'toggle-on',
  Toggle_Off: 'toggle-off',
  Clock_Tick: 'clock-tick',
  Drag_Start: 'drag-start',
  Long_Press: 'long-press',
  Segment_Tick: 'segment-tick',
  Segment_Frequent_Tick: 'segment-frequent-tick',
};
export const selectionAsync = jest.fn(() => Promise.resolve());
export const notificationAsync = jest.fn(() => Promise.resolve());
export const impactAsync = jest.fn(() => Promise.resolve());
export const performAndroidHapticsAsync = jest.fn(() => Promise.resolve());
