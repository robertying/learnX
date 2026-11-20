import type * as ReactNative from 'react-native';

jest.mock('modules/perf', () => ({
  __esModule: true,
  default: { reportFullyDrawn: jest.fn(() => Promise.resolve()) },
}));

const mockSettings = new Map<string, unknown>();
jest.mock('react-native/Libraries/Settings/Settings', () => ({
  __esModule: true,
  default: {
    get: (key: string) => mockSettings.get(key),
    set: (values: Record<string, unknown>) =>
      Object.entries(values).forEach(([key, value]) =>
        mockSettings.set(key, value),
      ),
  },
}));

/**
 * A fresh runtime on `os`, an E2E build unless `e2e` is false: marks are kept
 * once per JS runtime, so each test loads the module again, with the React
 * Native and build values it reads.
 */
const load = (os: 'ios' | 'android', { e2e = true } = {}) => {
  jest.resetModules();
  const { Platform } = jest.requireActual<typeof ReactNative>('react-native');
  jest.replaceProperty(Platform, 'OS', os);
  const env = jest.requireActual<{ default: { TEST_LOGIN?: boolean } }>(
    'test-utils/mocks/env',
  ).default;
  env.TEST_LOGIN = e2e || undefined;
  return {
    ...jest.requireActual<typeof import('services/perf')>('services/perf'),
    reportFullyDrawn: jest.requireMock<{
      default: { reportFullyDrawn: jest.Mock };
    }>('modules/perf').default.reportFullyDrawn,
  };
};

const saved = () =>
  JSON.parse(mockSettings.get('perfLaunches') as string) as unknown[];

beforeEach(() => {
  mockSettings.clear();
});

it('marks each point once, on the User Timing clock', () => {
  const mark = jest.spyOn(performance, 'mark');
  // setupEnv's mark, as React Native keeps it.
  const bundleStart = performance.now();
  Object.assign(performance, {
    getEntriesByName: (name: string) =>
      name === 'bundleStart' ? [{ startTime: bundleStart }] : [],
  });
  const { markPerf, launchMarks } = load('ios');
  markPerf('storesLoaded');
  markPerf('storesLoaded');
  expect(mark).toHaveBeenCalledTimes(1);
  expect(mark).toHaveBeenCalledWith('storesLoaded');
  const marks = launchMarks();
  expect(marks.bundleStart).toBe(Math.round(bundleStart));
  expect(marks.storesLoaded).toBeGreaterThanOrEqual(marks.bundleStart!);
  expect(marks.firstListDrawn).toBeUndefined();
  delete (performance as { getEntriesByName?: unknown }).getEntriesByName;
});

it('reports the first list drawn to Android and the performance scripts', () => {
  const info = jest.spyOn(console, 'info').mockImplementation(() => {});
  const { markPerf, reportFullyDrawn } = load('ios');
  markPerf('storesLoaded');
  markPerf('firstListDrawn');
  markPerf('firstListDrawn');

  expect(reportFullyDrawn).toHaveBeenCalledTimes(1);
  expect(info).toHaveBeenCalledTimes(1);
  expect(info.mock.calls[0][0]).toMatch(/^learnX perf \{.*"firstListDrawn"/);
  expect(saved()).toEqual([
    expect.objectContaining({ storesLoaded: expect.any(Number) }),
  ]);
});

it('keeps the last launches on Apple platforms, and starts over from a bad value', () => {
  jest.spyOn(console, 'info').mockImplementation(() => {});
  mockSettings.set('perfLaunches', 'not json');
  load('ios').markPerf('firstListDrawn');
  expect(saved()).toHaveLength(1);

  mockSettings.set(
    'perfLaunches',
    JSON.stringify(Array.from({ length: 30 }, (_, i) => ({ i }))),
  );
  load('ios').markPerf('firstListDrawn');
  expect(saved()).toHaveLength(30);
  expect(saved()[0]).toEqual({ i: 1 });
});

it('only logs on Android', () => {
  const info = jest.spyOn(console, 'info').mockImplementation(() => {});
  load('android').markPerf('firstListDrawn');
  expect(info).toHaveBeenCalledTimes(1);
  expect(mockSettings.has('perfLaunches')).toBe(false);
});

it('reports only to Android in other builds', () => {
  const info = jest.spyOn(console, 'info');
  const { markPerf, reportFullyDrawn } = load('android', { e2e: false });
  markPerf('firstListDrawn');
  expect(reportFullyDrawn).toHaveBeenCalledTimes(1);
  expect(info).not.toHaveBeenCalled();
});
