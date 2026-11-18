import type { Bridge } from './bridgeTypes';

export type * from './bridgeTypes';

/** The main process's services; throws outside the Electron app. */
export const bridge = (): Bridge => {
  const found = (globalThis as { learnx?: Bridge }).learnx;
  if (!found) {
    throw new Error('Not running in the learnX Electron app');
  }
  return found;
};
