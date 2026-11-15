export interface SSOScriptValues {
  username: string;
  password: string;
  deviceName: string;
  fingerPrint: string;
}

/**
 * Fills in the login page script (`helpers/preval/sso.js`). Each quoted
 * `'${name}'` placeholder there is replaced by a JSON string literal, so any
 * value, quotes, backslashes and `$` included, comes out as the same string.
 * The literal comes from a function: as a replacement string, a `$&`, `$'`,
 * `` $` `` or `$$` in a password would be read as a replacement pattern.
 */
export const fillSSOScript = (script: string, values: SSOScriptValues) =>
  Object.entries(values).reduce(
    (filled, [name, value]) =>
      filled.replaceAll(`'\${${name}}'`, () => JSON.stringify(value)),
    script,
  );
