import type { NavigationState, PartialState } from '@react-navigation/native';
import Crashlytics, { type StackFrame } from 'modules/crashlytics';
import { getCredentials } from 'data/credentials';
import { isMockUser } from 'helpers/mock';

// `at fn (file:line:column)`, `at fn (address at file:line:column)` (Hermes)
// or `at file:line:column`. Native frames (`at fn (native)`) have no location
// and are left out.
const FRAME_PATTERN =
  /^\s*at (?:(.+?) \()?(?:address at )?(.+?):(\d+):(\d+)\)?$/;

/** The frames of a Hermes or V8 `error.stack`, file names without their path or query. */
export const parseStack = (stack?: string): StackFrame[] =>
  (stack ?? '').split('\n').flatMap(line => {
    const match = FRAME_PATTERN.exec(line);
    if (!match) {
      return [];
    }
    const [, symbol, location, frameLine, column] = match;
    // Metro URLs carry their options after `?` or `//&`.
    const path = location.replace(/(\?|\/\/&).*$/, '');
    const file = path.split('/').pop() || path;
    return [
      {
        symbol: symbol || '<anonymous>',
        file,
        line: Number(frameLine),
        column: Number(column),
      },
    ];
  });

/**
 * Leaves the query and fragment out of every URL in `text`: they can carry
 * the CSRF token or ids that say whose data it is.
 */
export const scrubUrls = (text: string) =>
  text.replace(/(\bhttps?:\/\/[^\s?#"'<>]*)[?#][^\s"'<>]*/gi, '$1');

/**
 * Turns anything thrown into an `Error` that is safe to send: thu-learn-lib
 * rejects with plain `{ reason, extra }` objects whose `extra` can hold server
 * answers with the user's data, so only the `reason` goes; for other objects,
 * only their keys.
 */
const toError = (value: unknown): Error => {
  if (value instanceof Error) {
    return value;
  }
  let message: string;
  let name = 'NonError';
  if (typeof value === 'string') {
    message = value;
  } else if (
    value &&
    typeof value === 'object' &&
    typeof (value as { reason?: unknown }).reason === 'string'
  ) {
    name = 'ApiError';
    message = (value as { reason: string }).reason;
  } else if (value && typeof value === 'object') {
    message = `{${Object.keys(value).join(', ')}}`;
  } else {
    message = String(value);
  }
  const error = new Error(message);
  error.name = name;
  return error;
};

// Debug builds and the mock accounts would only add noise.
const shouldReport = () =>
  !__DEV__ && !!Crashlytics && !isMockUser(getCredentials()?.username);

/**
 * Sends a non-fatal report to Crashlytics with the error's JS frames, after
 * `logs` (e.g. a React component stack). Never throws.
 */
export function recordError(error: unknown, ...logs: string[]) {
  if (!shouldReport()) {
    return;
  }
  try {
    const { name, message, stack } = toError(error);
    for (const log of logs) {
      Crashlytics!.log(scrubUrls(log));
    }
    Crashlytics!.recordError(
      name || 'Error',
      scrubUrls(message),
      parseStack(stack),
    );
  } catch {
    // Reporting must never be the reason the app fails.
  }
}

/** Sent with every later report. Never throws. */
export function setCustomKey(key: string, value: string) {
  if (!shouldReport()) {
    return;
  }
  try {
    Crashlytics!.setCustomKey(key, value);
  } catch {}
}

let installed = false;

/**
 * Reports every uncaught JS error before React Native's own handler, which
 * still turns fatal ones into a native crash. The report is written first, so
 * Crashlytics sends it with the crash; `js_fatal` matches the two up.
 */
export function installGlobalErrorHandler() {
  if (installed) {
    return;
  }
  installed = true;

  const defaultHandler = ErrorUtils.getGlobalHandler();
  setCustomKey('js_fatal', 'false');
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    if (isFatal) {
      setCustomKey('js_fatal', 'true');
    }
    recordError(error);
    defaultHandler(error, isFatal);
  });
}

// Each launch reports at most this many unhandled rejections, and each
// distinct one once, so a failing loop can't flood Crashlytics.
const MAX_REJECTION_REPORTS = 10;

let trackingRejections = false;

/**
 * Reports promise rejections nothing handled as non-fatal errors. Hermes only
 * tracks them in development, where React Native shows them in LogBox, so this
 * turns its tracker on in release builds.
 */
export function installRejectionTracker() {
  const hermes = (globalThis as any).HermesInternal;
  if (__DEV__ || trackingRejections || !hermes?.enablePromiseRejectionTracker) {
    return;
  }
  trackingRejections = true;

  const reported = new Set<string>();
  hermes.enablePromiseRejectionTracker({
    allRejections: true,
    onUnhandled: (_id: number, rejection: unknown) => {
      const error = toError(rejection);
      const key = `${error.name}: ${error.message}`;
      if (reported.size >= MAX_REJECTION_REPORTS || reported.has(key)) {
        return;
      }
      reported.add(key);
      recordError(error, 'Unhandled promise rejection');
    },
    onHandled: () => {},
  });
}

type State = NavigationState | PartialState<NavigationState>;

const currentRouteName = (state: State | undefined): string | undefined => {
  let route: State['routes'][number] | undefined;
  while (state) {
    route = state.routes[state.index ?? state.routes.length - 1];
    state = route?.state as State | undefined;
  }
  return route?.name;
};

/**
 * Keeps the `screen` key on the screen last navigated to, in any navigation
 * container. For their `onStateChange`.
 */
export function trackScreen(state: NavigationState | undefined) {
  const name = currentRouteName(state);
  if (name) {
    setCustomKey('screen', name);
  }
}
