import { bridge } from 'web/bridge';
import { runTask } from 'web/packages/taskManager';

/**
 * Stands in for expo-background-task in the Electron app: a registered task
 * runs on the main process's timer, every `minimumInterval` minutes while
 * learnX runs (in the tray, too), and when the tray's Refresh is chosen.
 * One task at a time: a run that comes while one is under way is skipped.
 */

export enum BackgroundTaskResult {
  Success = 1,
  Failed = 2,
}

export enum BackgroundTaskStatus {
  Restricted = 1,
  Available = 2,
}

export const getStatusAsync = async () => BackgroundTaskStatus.Available;

let registered: string | null = null;
let running = false;
let listening = false;

/** Runs the registered task, unless one is already running. */
export const runRegisteredTask = async () => {
  if (!registered || running) {
    return;
  }
  running = true;
  try {
    await runTask(registered);
  } catch (error) {
    console.warn('Background task failed', error);
  } finally {
    running = false;
  }
};

export const registerTaskAsync = async (
  name: string,
  { minimumInterval = 15 }: { minimumInterval?: number } = {},
) => {
  registered = name;
  if (!listening) {
    listening = true;
    bridge().background.onRun(() => {
      void runRegisteredTask();
    });
  }
  await bridge().background.start(minimumInterval);
};

export const unregisterTaskAsync = async () => {
  registered = null;
};

export const triggerTaskWorkerForTestingAsync = runRegisteredTask;
