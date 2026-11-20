import { Settings } from 'react-native';
import Perf from 'modules/perf';
import env from 'helpers/env';
import { isApple } from 'helpers/platform';

/**
 * Startup marks, for the performance runs: when the stores the first screen
 * reads had loaded (`useStoresLoaded`) and when the first list was drawn with
 * its content (`useFirstListDrawn`: Today's, or the tab's a window opens on),
 * after `bundleStart`, which `setupEnv` marks as the bundle starts running.
 * Each is marked once per JS runtime, as a User Timing mark (React Native
 * DevTools and the Electron app's DevTools show them).
 */
export type PerfMark = 'storesLoaded' | 'firstListDrawn';

const marks: Partial<Record<PerfMark, number>> = {};

/** React Native's own startup timing, on `performance.now()`'s clock. */
interface StartupTiming {
  startTime?: number | null;
  initializeRuntimeStart?: number | null;
  executeJavaScriptBundleEntryPointStart?: number | null;
}

/** How many launches' marks Apple builds keep (`perfLaunches`). */
const KEPT_LAUNCHES = 30;

export const markPerf = (name: PerfMark) => {
  if (marks[name] !== undefined) {
    return;
  }
  marks[name] = performance.now();
  performance.mark(name);
  if (name === 'firstListDrawn') {
    // Release builds too: it's Google Play's time to full display.
    void Perf?.reportFullyDrawn();
    if (env.TEST_LOGIN) {
      report();
    }
  }
};

/**
 * The launch's marks in ms since React Native started (since the page started
 * in the Electron app), and the JS heap then.
 */
export const launchMarks = () => {
  const timing = (performance as { rnStartupTiming?: StartupTiming })
    .rnStartupTiming;
  const start = timing?.startTime ?? 0;
  const since = (time: number | null | undefined) =>
    typeof time === 'number' ? Math.round(time - start) : undefined;
  const memory = (performance as { memory?: { usedJSHeapSize?: number } })
    .memory;
  return {
    at: new Date().toISOString(),
    runtimeStart: since(timing?.initializeRuntimeStart),
    bundleStart: since(
      performance.getEntriesByName?.('bundleStart', 'mark')[0]?.startTime,
    ),
    storesLoaded: since(marks.storesLoaded),
    firstListDrawn: since(marks.firstListDrawn),
    jsHeapMB:
      memory?.usedJSHeapSize !== undefined
        ? Math.round(memory.usedJSHeapSize / 1e5) / 10
        : undefined,
  };
};

/**
 * E2E builds (Release, as the performance runs measure) hand the launch's
 * marks to the performance scripts:
 * one `learnX perf {…}` log line (Android's log, the Electron app's console),
 * and on iOS and the Mac the last launches' marks in user defaults
 * (`perfLaunches`, JSON), since release builds don't log there.
 */
const report = () => {
  const launch = launchMarks();
  console.info(`learnX perf ${JSON.stringify(launch)}`);
  if (isApple()) {
    const saved: unknown = Settings.get('perfLaunches');
    let launches: unknown[] = [];
    try {
      const parsed: unknown =
        typeof saved === 'string' ? JSON.parse(saved) : [];
      launches = Array.isArray(parsed) ? parsed : [];
    } catch {
      // Starts over from a value that isn't the list.
    }
    Settings.set({
      perfLaunches: JSON.stringify([...launches, launch].slice(-KEPT_LAUNCHES)),
    });
  }
};
