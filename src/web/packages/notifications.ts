/**
 * Stands in for expo-notifications in the Electron app until it gets Windows
 * notifications from the tray (phase 4 of the plan): permission is denied,
 * so the app schedules nothing, and nothing was tapped.
 */

export const DEFAULT_ACTION_IDENTIFIER =
  'expo.modules.notifications.actions.DEFAULT';

export enum AndroidImportance {
  UNKNOWN = 0,
  UNSPECIFIED = 1,
  NONE = 2,
  MIN = 3,
  LOW = 4,
  DEFAULT = 5,
  HIGH = 6,
  MAX = 7,
}

export enum IosAuthorizationStatus {
  NOT_DETERMINED = 0,
  DENIED = 1,
  AUTHORIZED = 2,
  PROVISIONAL = 3,
  EPHEMERAL = 4,
}

export enum SchedulableTriggerInputTypes {
  CALENDAR = 'calendar',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  DATE = 'date',
  TIME_INTERVAL = 'timeInterval',
}

const denied = {
  status: 'denied',
  granted: false,
  canAskAgain: false,
  expires: 'never',
} as const;

export const getPermissionsAsync = async () => denied;
export const requestPermissionsAsync = async () => denied;
export const getExactAlarmPermissionsAsync = async () => denied;
export const requestExactAlarmPermissionsAsync = async () => denied;

export const scheduleNotificationAsync = async () => '';
export const getAllScheduledNotificationsAsync = async (): Promise<
  never[]
> => [];
export const cancelScheduledNotificationAsync = async () => {};
export const dismissNotificationAsync = async () => {};
export const setNotificationChannelAsync = async () => null;
export const setNotificationCategoryAsync = async () => null;
export const setNotificationHandler = () => {};
export const registerTaskAsync = async () => null;

export const getLastNotificationResponse = () => null;
export const useLastNotificationResponse = () => null;
export const clearLastNotificationResponse = () => {};
export const addNotificationResponseReceivedListener = () => ({
  remove: () => {},
});
