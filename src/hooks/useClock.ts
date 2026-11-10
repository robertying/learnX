import { useSyncExternalStore } from 'react';
import { AppState, type NativeEventSubscription } from 'react-native';
import dayjs from 'dayjs';
import { beijingDate } from 'helpers/serverTime';

// Clocks for text that changes with time. They share one timer, which wakes
// at the start of each minute, and tick again when the app comes back to the
// foreground (timers don't run in the background). Components only
// re-render when the value they read has changed.

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;
let appState: NativeEventSubscription | undefined;

const notify = () => listeners.forEach(listener => listener());

// A little past the minute, so a timer that fires a few ms early doesn't
// read the old minute.
const untilNextMinute = () => 60_000 - (Date.now() % 60_000) + 50;

const schedule = () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    notify();
    schedule();
  }, untilNextMinute());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (listeners.size === 1) {
    schedule();
    appState = AppState.addEventListener('change', state => {
      if (state === 'active') {
        notify();
        schedule();
      }
    });
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearTimeout(timer);
      timer = undefined;
      appState?.remove();
      appState = undefined;
    }
  };
};

const getMinute = () => Math.floor(Date.now() / 60_000) * 60_000;

/**
 * The current time, to the minute, for text counting down to or up from now
 * (such as "due in 3 hours") that should keep up on a screen left open.
 */
export const useMinute = () => useSyncExternalStore(subscribe, getMinute);

const getToday = () => dayjs(getMinute()).startOf('day').valueOf();

/**
 * The start of today on the device (ms), for text that only changes with the
 * day, such as list times (`helpers/listTime`). Re-renders at midnight.
 */
export const useToday = () => useSyncExternalStore(subscribe, getToday);

const getBeijingDay = () => beijingDate(getMinute());

/**
 * The day it is in Beijing (YYYY-MM-DD), which the timetable follows, also on
 * a phone in another time zone. Re-renders when that day changes.
 */
export const useBeijingDay = () =>
  useSyncExternalStore(subscribe, getBeijingDay);
