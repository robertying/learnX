import { type ComponentType, createElement } from 'react';
import { Platform, Settings } from 'react-native';
import {
  type MockFailure,
  type MockLatency,
  setMockNetworkConfig,
} from 'data/mockSource';
import env from 'helpers/env';

/**
 * Launch arguments that set up the app for a test run, e.g. Maestro's
 * `launchApp: { arguments: { mockLatency: none } }`. iOS reads them from the
 * launch arguments (`-mockLatency none`, through NSUserDefaults); Android
 * passes the launch intent's extras as the root component's initial props
 * (MainActivity), in debug and E2E builds only.
 */
export interface LaunchOptions {
  /** The emulated server's latency for a mock account. */
  mockLatency?: unknown;
  /**
   * How the emulated server fails for a mock account (`offline`,
   * `serverError`, `timeout`), so flows can reach the error states.
   */
  mockFailure?: unknown;
  /**
   * `true` shows what the app keeps as JSON in place of the app, for the
   * upgrade test (`screens/StoreReport`, mock account only).
   */
  storeReport?: unknown;
  /**
   * A test login: typing this username signs in with `liveFingerprint`
   * instead of opening the SSO page, which adds a device each time. The live
   * test account (`scripts/e2e.sh --live`) passes the fingerprint of an
   * earlier SSO login; the login check flow passes an account that doesn't
   * exist. Only debug builds and E2E builds (TEST_LOGIN) take them.
   */
  liveUsername?: unknown;
  liveFingerprint?: unknown;
}

export interface LiveLogin {
  username: string;
  fingerPrint: string;
}

let liveLogin: LiveLogin | undefined;

/** The live test login from the launch arguments, if any. */
export const getLiveLogin = () => liveLogin;

const latencies = new Set<unknown>(['none', 'normal', 'slow']);

const isLatency = (value: unknown): value is MockLatency =>
  latencies.has(value);

const failures = new Set<unknown>([
  'none',
  'offline',
  'serverError',
  'timeout',
]);

const isFailure = (value: unknown): value is MockFailure => failures.has(value);

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
  const mockFailure = read('mockFailure', initialProps);
  if (isFailure(mockFailure)) {
    setMockNetworkConfig({ failure: mockFailure });
  }

  if (__DEV__ || env.TEST_LOGIN) {
    const username = read('liveUsername', initialProps);
    const fingerPrint = read('liveFingerprint', initialProps);
    liveLogin =
      typeof username === 'string' &&
      username &&
      typeof fingerPrint === 'string' &&
      fingerPrint
        ? { username, fingerPrint }
        : undefined;
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
