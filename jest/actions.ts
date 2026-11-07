/**
 * Builds a plain action without importing the action creators, which pull in
 * the store, the data source and native modules. Typed as `never` so it can be
 * passed to any reducer.
 */
export const action = (type: string, payload?: unknown) =>
  ({ type, payload }) as never;

/** An action no reducer handles, to read each reducer's initial state. */
export const INIT = action('@@test/INIT');
