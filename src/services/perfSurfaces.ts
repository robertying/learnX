// TEMPORARY (perf pass 7): counts what the surfaces write to the system per
// refresh, and drives a fixed scenario. Never merged.
import { AppState, Settings } from 'react-native';
import { isApple } from 'helpers/platform';

type Counts = Record<string, number>;
let counts: Counts = {};
let times: Record<string, number> = {};

export const perfCount = (name: string, n = 1): false => {
  counts[name] = (counts[name] ?? 0) + n;
  return false;
};

export const perfTime = (name: string, ms: number) => {
  times[name] = Math.round(((times[name] ?? 0) + ms) * 10) / 10;
};

const KEY = 'perfSurfaces';

export const perfFlush = (phase: string) => {
  const entry = { at: new Date().toISOString(), phase, counts, times };
  counts = {};
  times = {};
  console.info(`learnX perf7 ${JSON.stringify(entry)}`);
  if (isApple()) {
    let list: unknown[] = [];
    try {
      const saved: unknown = Settings.get(KEY);
      const parsed: unknown =
        typeof saved === 'string' ? JSON.parse(saved) : [];
      list = Array.isArray(parsed) ? parsed : [];
    } catch {}
    Settings.set({ [KEY]: JSON.stringify([...list, entry].slice(-200)) });
  }
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let started = false;

/**
 * After the first list: launch phase, favorite an assignment, favorite a
 * notice, then each return to the app is a phase of its own.
 */
export const runPerfScenario = () => {
  if (started) {
    return;
  }
  started = true;
  void (async () => {
    const { setSetting, getSettings } =
      require('data/settings') as typeof import('data/settings');
    const settings = getSettings();
    setSetting('assignmentCalendarSync', true);
    setSetting('assignmentReminderSync', isApple());
    setSetting('notifications', {
      ...settings.notifications,
      deadlineReminders: true,
      classReminders: true,
    });
    await wait(12000);
    perfFlush('launch');
    const { queryClient } =
      require('data/queryClient') as typeof import('data/queryClient');
    const { getUserData } =
      require('data/userData') as typeof import('data/userData');
    const { assignmentsQuery, noticesQuery } =
      require('data/content') as typeof import('data/content');
    const { setFavorite } =
      require('data/serverActions') as typeof import('data/serverActions');
    const semester = getUserData().currentSemester ?? '';
    const assignments =
      queryClient.getQueryData(assignmentsQuery(semester).queryKey) ?? [];
    const notices =
      queryClient.getQueryData(noticesQuery(semester).queryKey) ?? [];
    const now = Date.now();
    const open = assignments.find(
      a => !a.submitted && new Date(a.deadline).getTime() > now,
    );
    for (const round of [1, 2]) {
      if (open) {
        setFavorite('assignment', open.id, round === 1);
        await wait(6000);
        perfFlush(`favAssignment${round}`);
      }
      if (notices[0]) {
        setFavorite('notice', notices[0].id, round === 1);
        await wait(6000);
        perfFlush(`favNotice${round}`);
      }
    }
    AppState.addEventListener('change', state => {
      if (state === 'active') {
        setTimeout(() => perfFlush('resume'), 6000);
      }
    });
  })();
};
