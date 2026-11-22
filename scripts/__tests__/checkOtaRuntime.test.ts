// scripts/checks/check-ota-runtime.mjs's verdicts, run in Node (ESM). The fingerprints
// themselves come from expo-updates.
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const script = join(__dirname, '../checks/check-ota-runtime.mjs');

interface State {
  runtimeVersion: string;
  ios: string;
  android: string;
  sources?: Record<string, Record<string, string>>;
}

/**
 * `released`: whether every version has shipped, or the versions that have.
 * `appVersion`: package.json's, the current runtime version unless given.
 */
const verdict = (
  recorded: State,
  current: State,
  released: boolean | string[] = true,
  appVersion = current.runtimeVersion,
): string | null =>
  JSON.parse(
    execFileSync(
      'node',
      [
        '--input-type=module',
        '-e',
        `const { verdict } = await import(${JSON.stringify(script)});
const released = ${JSON.stringify(released)};
process.stdout.write(JSON.stringify(verdict(${JSON.stringify(recorded)}, ${JSON.stringify(current)}, v => Array.isArray(released) ? released.includes(v) : released, ${JSON.stringify(appVersion)})));`,
      ],
      { encoding: 'utf8' },
    ),
  );

const recorded = { runtimeVersion: '19.0.0', ios: 'a', android: 'b' };

test('passes when nothing native changed', () => {
  expect(verdict(recorded, recorded)).toBeNull();
});

test("doesn't ask origin whether it shipped unless native code changed", () => {
  // Asking throws here, as it would offline.
  const offline = (current: State) =>
    execFileSync(
      'node',
      [
        '--input-type=module',
        '-e',
        `const { verdict } = await import(${JSON.stringify(script)});
verdict(${JSON.stringify(recorded)}, ${JSON.stringify(current)}, () => { throw new Error('offline'); }, ${JSON.stringify(current.runtimeVersion)});`,
      ],
      { stdio: 'pipe' },
    );
  expect(() => offline(recorded)).not.toThrow();
  expect(() =>
    offline({ ...recorded, runtimeVersion: '19.1.0' }),
  ).not.toThrow();
  expect(() => offline({ ...recorded, ios: 'c' })).toThrow(/offline/);
});

test('asks for a new runtime version when native code changed', () => {
  expect(verdict(recorded, { ...recorded, android: 'c' })).toMatch(
    /^Native code changed \(android: see the fingerprint\) but the over-the-air runtime version is still 19\.0\.0, which has shipped: move the app version to the coming release's \(`pnpm bump minor`/,
  );
});

test("names main's app version as the new runtime version when it hasn't shipped", () => {
  expect(
    verdict(recorded, { ...recorded, ios: 'c' }, ['19.0.0'], '19.1.0'),
  ).toMatch(/set runtimeVersion in app\.json to 19\.1\.0, the app version/);
});

test('moves the runtime version only together with the app version', () => {
  const current = { runtimeVersion: '19.1.0', ios: 'c', android: 'd' };
  expect(verdict(recorded, current, ['19.0.0'], '19.0.0')).toMatch(
    /app version 19\.0\.0 is behind the over-the-air runtime version 19\.1\.0/,
  );
  expect(
    verdict(
      recorded,
      { ...current, runtimeVersion: '19.0.5' },
      ['19.0.0'],
      '19.1.0',
    ),
  ).toMatch(/moved to 19\.0\.5, but the app version is 19\.1\.0/);
  expect(verdict(recorded, current, ['19.0.0', '19.1.0'])).toMatch(
    /moved to 19\.1\.0, which has already shipped/,
  );
  expect(verdict(recorded, current, ['19.0.0'])).toContain(
    JSON.stringify(current, null, 2),
  );
});

test('passes a JS-only version ahead of the runtime version', () => {
  expect(verdict(recorded, recorded, true, '19.0.1')).toBeNull();
});

test('only asks to record native changes before the version shipped', () => {
  const current = { ...recorded, ios: 'c' };
  const message = verdict(recorded, current, false);
  expect(message).toMatch(
    /^Native code changed \(ios: see the fingerprint\) before 19\.0\.0 shipped/,
  );
  expect(message).toContain(JSON.stringify(current, null, 2));
});

test('names the native sources that changed', () => {
  const sources = (pdf: string) => ({
    ios: { 'dir ios': '1', 'package node_modules/react-native-screens': pdf },
    android: {},
  });
  expect(
    verdict(
      { ...recorded, sources: sources('2') },
      { ...recorded, ios: 'c', sources: sources('3') },
    ),
  ).toMatch(
    /^Native code changed \(ios: package node_modules\/react-native-screens\)/,
  );
});

test('refuses a new runtime version without a native change', () => {
  expect(verdict(recorded, { ...recorded, runtimeVersion: '19.1.0' })).toMatch(
    /changed from 19\.0\.0 to 19\.1\.0 with no native change/,
  );
});

test('asks to record a new runtime version that comes with native changes', () => {
  const current = { runtimeVersion: '19.1.0', ios: 'c', android: 'd' };
  expect(verdict(recorded, current, ['19.0.0'])).toContain(
    JSON.stringify(current, null, 2),
  );
});
