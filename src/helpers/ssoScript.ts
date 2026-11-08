export interface SSOScriptValues {
  username: string;
  password: string;
  deviceName: string;
  fingerPrint: string;
}

/**
 * Fills in the login page script (`helpers/preval/sso.js`). Each quoted
 * `'${name}'` placeholder there is replaced by a JSON string literal, so any
 * value, quotes and backslashes included, comes out as the same string.
 */
export const fillSSOScript = (script: string, values: SSOScriptValues) =>
  Object.entries(values).reduce(
    (filled, [name, value]) =>
      filled.replaceAll(`'\${${name}}'`, JSON.stringify(value)),
    script,
  );
