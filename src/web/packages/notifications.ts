import { useSyncExternalStore } from 'react';
import {
  bridge,
  type BridgeNotificationRequest,
  type BridgeScheduledNotification,
} from 'web/bridge';

/**
 * Stands in for expo-notifications in the Electron app: the main process
 * shows each notification (electron/notifications.cjs), right away or, for a
 * reminder, at its time while learnX runs, and says which one was clicked.
 * Windows and Linux ask for no permission: notifications are allowed
 * wherever the system shows them. There are no action buttons, channels or
 * categories, which the app sets up only for the phone.
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

const permission = (granted: boolean) =>
  ({
    status: granted ? 'granted' : 'denied',
    granted,
    canAskAgain: false,
    expires: 'never',
  }) as const;

export const getPermissionsAsync = async () =>
  permission(await bridge().notifications.supported());
export const requestPermissionsAsync = getPermissionsAsync;
/** Reminders go off on time, from the main process's timers. */
export const getExactAlarmPermissionsAsync = async () => permission(true);
export const requestExactAlarmPermissionsAsync = getExactAlarmPermissionsAsync;

type TriggerInput = null | {
  type?: string;
  date?: Date | number | string;
  seconds?: number;
  channelId?: string;
};

interface RequestInput {
  identifier?: string;
  content: BridgeNotificationRequest['content'];
  trigger?: TriggerInput;
}

/** A trigger the main process can keep: dates as milliseconds. */
const toBridgeTrigger = (
  trigger: TriggerInput | undefined,
): BridgeNotificationRequest['trigger'] => {
  if (!trigger || !trigger.type) {
    return null;
  }
  const { type, seconds, date } = trigger;
  return {
    type,
    ...(seconds !== undefined ? { seconds } : {}),
    ...(date !== undefined ? { date: new Date(date).getTime() } : {}),
  };
};

let nextId = 1;

export const scheduleNotificationAsync = async ({
  identifier,
  content,
  trigger,
}: RequestInput) =>
  bridge().notifications.schedule({
    identifier: identifier ?? `learnx-${Date.now()}-${nextId++}`,
    // Only what can cross to the main process.
    content: JSON.parse(JSON.stringify(content)) as RequestInput['content'],
    trigger: toBridgeTrigger(trigger),
  });

export const getAllScheduledNotificationsAsync = async (): Promise<
  BridgeScheduledNotification[]
> => bridge().notifications.list();

export const cancelScheduledNotificationAsync = async (identifier: string) =>
  bridge().notifications.cancel(identifier);

export const cancelAllScheduledNotificationsAsync = async () => {
  const scheduled = await getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled.map(n => cancelScheduledNotificationAsync(n.identifier)),
  );
};

export const dismissNotificationAsync = async () => {};
export const setNotificationChannelAsync = async () => null;
export const setNotificationCategoryAsync = async () => null;
export const setNotificationHandler = () => {};
export const registerTaskAsync = async () => null;

/** A clicked notification, as expo-notifications reports a tap. */
export interface NotificationResponse {
  actionIdentifier: string;
  notification: {
    date: number;
    request: BridgeNotificationRequest;
  };
}

type ResponseListener = (response: NotificationResponse) => void;

let lastResponse: NotificationResponse | null = null;
const responseListeners = new Set<ResponseListener>();
const storeListeners = new Set<() => void>();

const setLastResponse = (response: NotificationResponse | null) => {
  lastResponse = response;
  storeListeners.forEach(listener => listener());
};

/** Called with a notification the user clicked. */
export const receiveResponse = (request: BridgeNotificationRequest) => {
  const response: NotificationResponse = {
    actionIdentifier: DEFAULT_ACTION_IDENTIFIER,
    notification: { date: Date.now(), request },
  };
  setLastResponse(response);
  responseListeners.forEach(listener => listener(response));
};

export const getLastNotificationResponse = () => lastResponse;
export const getLastNotificationResponseAsync = async () => lastResponse;
export const clearLastNotificationResponse = () => setLastResponse(null);
export const clearLastNotificationResponseAsync = async () =>
  clearLastNotificationResponse();

const subscribe = (listener: () => void) => {
  storeListeners.add(listener);
  return () => {
    storeListeners.delete(listener);
  };
};

export const useLastNotificationResponse = () =>
  useSyncExternalStore(subscribe, getLastNotificationResponse);

export const addNotificationResponseReceivedListener = (
  listener: ResponseListener,
) => {
  responseListeners.add(listener);
  return {
    remove: () => {
      responseListeners.delete(listener);
    },
  };
};

/**
 * A notification a dev run only logged (electron/desktop.cjs), shown as a
 * toast so it can be seen without posting one to the system.
 */
const showDevNotification = ({
  title,
  subtitle,
  body,
}: {
  title: string;
  subtitle?: string;
  body: string;
}) => {
  const { toast } =
    require('components/Toast') as typeof import('components/Toast');
  toast(
    [title, subtitle, body].filter(Boolean).join(' · ').replaceAll('\n', ' · '),
    'none',
  );
};

let listening = false;

/** Starts hearing the main process's clicks, once, in the Electron app. */
export const listenForResponses = () => {
  const learnx = (globalThis as { learnx?: ReturnType<typeof bridge> }).learnx;
  if (listening || !learnx) {
    return;
  }
  listening = true;
  learnx.notifications.onResponse(receiveResponse);
  learnx.notifications.onDevShown(showDevNotification);
};

listenForResponses();
