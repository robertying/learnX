// Notifications need the native module; tests read what was scheduled.
const granted = () => Promise.resolve({ granted: true, canAskAgain: true });

export const AndroidImportance = { DEFAULT: 3, HIGH: 4 };
export const IosAuthorizationStatus = { PROVISIONAL: 3 };
export const SchedulableTriggerInputTypes = {
  DATE: 'date',
  TIME_INTERVAL: 'timeInterval',
};
export const DEFAULT_ACTION_IDENTIFIER =
  'expo.modules.notifications.actions.DEFAULT';

export const setNotificationHandler = jest.fn();
export const setNotificationChannelAsync = jest.fn(() => Promise.resolve(null));
export const getPermissionsAsync = jest.fn(() =>
  Promise.resolve({ granted: false, canAskAgain: true }),
);
export const requestPermissionsAsync = jest.fn(granted);
export const getExactAlarmPermissionsAsync = jest.fn(granted);
export const requestExactAlarmPermissionsAsync = jest.fn(granted);
export const scheduleNotificationAsync = jest.fn(() => Promise.resolve('id'));
export const cancelScheduledNotificationAsync = jest.fn(() =>
  Promise.resolve(),
);
export const getAllScheduledNotificationsAsync = jest.fn(() =>
  Promise.resolve([]),
);
export const setNotificationCategoryAsync = jest.fn(() => Promise.resolve([]));
export const dismissNotificationAsync = jest.fn(() => Promise.resolve());
export const useLastNotificationResponse = jest.fn(() => null);
export const getLastNotificationResponse = jest.fn(() => null);
export const clearLastNotificationResponse = jest.fn();
export const addNotificationResponseReceivedListener = jest.fn(() => ({
  remove: jest.fn(),
}));
// The Android action task (services/notificationActions)
export const registerTaskAsync = jest.fn(() => Promise.resolve(null));
