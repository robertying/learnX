// The texts the Maestro flows match, from the same source
// (scripts/e2e/e2e-env.mjs): `T_<key>` translations and `MOCK_*` mock items, each
// an English|Chinese alternation, so a flow ports with the same values.
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = path.join(__dirname, '..', '..');

let cached: Record<string, string> | undefined;

/** Every `KEY=value` scripts/e2e/e2e-env.mjs prints. */
export const maestroEnv = (): Record<string, string> => {
  cached ??= Object.fromEntries(
    execFileSync(
      process.execPath,
      [
        '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
        path.join(root, 'scripts', 'e2e-env.mjs'),
      ],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    )
      .split('\n')
      .filter(line => line.includes('='))
      .map(line => [
        line.slice(0, line.indexOf('=')),
        line.slice(line.indexOf('=') + 1),
      ]),
  );
  return cached;
};

const value = (key: string) => {
  const found = maestroEnv()[key];
  if (found === undefined) {
    throw new Error(`scripts/e2e/e2e-env.mjs prints no ${key}`);
  }
  // A translation's `{param}` placeholders (escaped for a regex, as every
  // value is) match whatever fills them in.
  return found.replace(/\\\{\w+\\\}/g, '.+');
};

/**
 * A value as the regular expression a flow uses: `'.*(${MOCK_NOTICE}).*'`
 * is `text('MOCK_NOTICE')` with `getByText`. Any `T_<key>` a test names this
 * way is printed (scripts/e2e/e2e-env.mjs reads the tests for them).
 */
export const text = (key: string) => new RegExp(value(key));

/**
 * A value matching a whole label, as a flow's `'${T_delete}'` does: a
 * button named `Delete`, not `Delete…`.
 */
export const exact = (key: string) => new RegExp(`^(${value(key)})$`);
