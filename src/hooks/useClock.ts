import { useSyncExternalStore } from 'react';
import { beijingDate } from 'helpers/serverTime';

// Clocks for text that changes with time. They share one 10 s timer.

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  // Checked often enough that a new minute shows up within seconds, also
  // after the app comes back from the background. Components only re-render
  // when the minute has changed.
  timer ??= setInterval(() => listeners.forEach(l => l()), 10_000);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
    }
  };
};

const getMinute = () => Math.floor(Date.now() / 60_000) * 60_000;

/**
 * The current time, to the minute, for text relative to now (such as "due in
 * 3 hours") that should keep up on a screen left open.
 */
export const useMinute = () => useSyncExternalStore(subscribe, getMinute);

const getBeijingDay = () => beijingDate(getMinute());

/**
 * The day it is in Beijing (YYYY-MM-DD), which the timetable follows, also on
 * a phone in another time zone. Re-renders when that day changes.
 */
export const useBeijingDay = () =>
  useSyncExternalStore(subscribe, getBeijingDay);
