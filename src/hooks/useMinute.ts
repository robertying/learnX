import { useSyncExternalStore } from 'react';

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
const useMinute = () => useSyncExternalStore(subscribe, getMinute);

export default useMinute;
