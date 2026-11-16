// The texts the Maestro flows match, from the same source
// (scripts/e2e-env.mjs): `T_<key>` translations and `MOCK_*` mock items, each
// an English|Chinese alternation, so a flow ports with the same values.
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = path.join(__dirname, '..', '..');

let cached: Record<string, string> | undefined;

/** Every `KEY=value` scripts/e2e-env.mjs prints. */
export const maestroEnv = (): Record<string, string> => {
  cached ??= Object.fromEntries(
    execFileSync(
      process.execPath,
      [path.join(root, 'scripts', 'e2e-env.mjs')],
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

/**
 * A value as the regular expression a flow uses: `'.*(${MOCK_NOTICE}).*'`
 * is `text('MOCK_NOTICE')` with `getByText`.
 */
export const text = (key: string) => {
  const value = maestroEnv()[key];
  if (value === undefined) {
    throw new Error(`scripts/e2e-env.mjs prints no ${key}`);
  }
  return new RegExp(value);
};
