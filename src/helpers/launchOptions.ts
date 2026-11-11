import { type ComponentType, createElement } from 'react';
import { Platform, Settings } from 'react-native';
import { type MockLatency, setMockNetworkConfig } from 'data/mockSource';

/**
 * Launch arguments that set up the app for a test run, e.g. Maestro's
 * `launchApp: { arguments: { mockLatency: none } }`. iOS reads them from the
 * launch arguments (`-mockLatency none`, through NSUserDefaults); Android
 * passes the launch intent's extras as the root component's initial props
 * (MainActivity).
 */
export interface LaunchOptions {
  /** The emulated server's latency for a mock account. */
  mockLatency?: unknown;
  /**
   * `true` shows what the app keeps as JSON in place of the app, for the
   * upgrade test (`screens/StoreReport`, mock account only).
   */
  storeReport?: unknown;
}

const latencies = new Set<unknown>(['none', 'normal', 'slow']);

const isLatency = (value: unknown): value is MockLatency =>
  latencies.has(value);

const read = (key: keyof LaunchOptions, initialProps?: LaunchOptions) =>
  Platform.OS === 'ios' ? (Settings.get(key) as unknown) : initialProps?.[key];

/**
 * Applies the launch arguments; unknown values are ignored. Returns whether
 * the store report replaces the app.
 */
export const applyLaunchOptions = (initialProps?: LaunchOptions) => {
  const mockLatency = read('mockLatency', initialProps);
  if (isLatency(mockLatency)) {
    setMockNetworkConfig({ latency: mockLatency });
  }
  // NSUserDefaults reads `-storeReport true` as the string.
  const storeReport = read('storeReport', initialProps);
  return { storeReport: storeReport === true || storeReport === 'true' };
};

/**
 * The root component: applies the launch arguments before the app first
 * renders, so they're in place before the saved login is used. Only once, so
 * a later change (e.g. from the Debug page) sticks.
 */
export const withLaunchOptions = (App: ComponentType) => {
  let Root: ComponentType | null = null;
  return (initialProps: LaunchOptions) => {
    if (!Root) {
      Root = applyLaunchOptions(initialProps).storeReport
        ? // Loaded only for it, so a normal launch never does.
          (require('screens/StoreReport') as { default: ComponentType }).default
        : App;
    }
    return createElement(Root);
  };
};
