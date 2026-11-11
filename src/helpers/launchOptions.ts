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
}

const latencies = new Set<unknown>(['none', 'normal', 'slow']);

const isLatency = (value: unknown): value is MockLatency =>
  latencies.has(value);

/** Applies the launch arguments; unknown values are ignored. */
export const applyLaunchOptions = (initialProps?: LaunchOptions) => {
  const mockLatency: unknown =
    Platform.OS === 'ios'
      ? Settings.get('mockLatency')
      : initialProps?.mockLatency;
  if (isLatency(mockLatency)) {
    setMockNetworkConfig({ latency: mockLatency });
  }
};

/**
 * The root component: applies the launch arguments before the app first
 * renders, so they're in place before the saved login is used. Only once, so
 * a later change (e.g. from the Debug page) sticks.
 */
export const withLaunchOptions = (App: ComponentType) => {
  let applied = false;
  return (initialProps: LaunchOptions) => {
    if (!applied) {
      applied = true;
      applyLaunchOptions(initialProps);
    }
    return createElement(App);
  };
};
