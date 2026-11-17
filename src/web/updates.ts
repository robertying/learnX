import type { Bridge, BridgeUpdate } from 'web/bridge';
import { bridge } from 'web/bridge';

/**
 * The Electron app's update waiting for a restart (electron/updater.cjs), as
 * an external store for `useSyncExternalStore`: read from the main process
 * once, then kept as it reports downloads.
 */
let store: {
  bridge: Bridge;
  pending: BridgeUpdate | null;
} | null = null;
const listeners = new Set<() => void>();

export const pendingUpdate = (): BridgeUpdate | null => {
  const current = bridge();
  if (store?.bridge !== current) {
    const next = { bridge: current, pending: current.updates.pending() };
    store = next;
    current.updates.onReady(update => {
      next.pending = update;
      listeners.forEach(listener => listener());
    });
  }
  return store.pending;
};

export const subscribeToUpdates = (listener: () => void) => {
  pendingUpdate();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Quits, installs the waiting update and opens learnX again. */
export const installUpdate = () => bridge().updates.install();

/** The GitHub release of an Electron app version (its tag's page). */
export const releaseUrl = (version: string) =>
  `https://github.com/robertying/learnX/releases/tag/v${version}`;
