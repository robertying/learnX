/**
 * Debug builds don't send anything that changes the real account (assignment
 * submissions, course information sharing, favorites) until it's allowed in
 * Settings, so testing with a real account can't change it by accident.
 * Favorites wait in the queue meanwhile and go out when it is. Not persisted: a
 * JS reload blocks them again. Release builds always allow them, and the mock
 * accounts go to the emulated server either way.
 */
let allowed = !__DEV__;
const listeners = new Set<() => void>();

export const getServerWritesAllowed = () => allowed;

export const setServerWritesAllowed = (value: boolean) => {
  allowed = value;
  listeners.forEach(l => l());
};

export const subscribeServerWrites = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const assertServerWritesAllowed = (what: string) => {
  if (!allowed) {
    throw new Error(
      `${what} blocked: debug builds need "Allow Server Writes" in Settings`,
    );
  }
};
