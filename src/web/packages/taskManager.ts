/**
 * Stands in for expo-task-manager in the Electron app: the tasks the app
 * defines are kept here, and run when the main process's timer says
 * (`web/packages/backgroundTask`), while learnX runs.
 */

type TaskBody = (body: { data: unknown; error: null }) => unknown;

const tasks = new Map<string, TaskBody>();

export const defineTask = (name: string, task: TaskBody) => {
  tasks.set(name, task);
};

export const isTaskDefined = (name: string) => tasks.has(name);

/** Runs a defined task; resolves to what it returned. */
export const runTask = async (name: string) => {
  const task = tasks.get(name);
  if (!task) {
    throw new Error(`Task ${name} isn't defined`);
  }
  return task({ data: null, error: null });
};

export const isTaskRegisteredAsync = async (name: string) => tasks.has(name);
export const unregisterTaskAsync = async () => {};
export const unregisterAllTasksAsync = async () => {};
