// scripts/check-ota-runtime.mjs's verdicts, run in Node (ESM). The fingerprints
// themselves come from expo-updates.
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const script = join(__dirname, '../check-ota-runtime.mjs');

interface State {
  runtimeVersion: string;
  ios: string;
  android: string;
}

const verdict = (
  recorded: State,
  current: State,
  released = true,
): string | null =>
  JSON.parse(
    execFileSync(
      'node',
      [
        '--input-type=module',
        '-e',
        `const { verdict } = await import(${JSON.stringify(script)});
process.stdout.write(JSON.stringify(verdict(${JSON.stringify(recorded)}, ${JSON.stringify(current)}, ${released})));`,
      ],
      { encoding: 'utf8' },
    ),
  );

const recorded = { runtimeVersion: '19.0.0', ios: 'a', android: 'b' };

test('passes when nothing native changed', () => {
  expect(verdict(recorded, recorded)).toBeNull();
});

test('asks for a new runtime version when native code changed', () => {
  expect(verdict(recorded, { ...recorded, android: 'c' })).toMatch(
    /^Native code changed \(android\) but the over-the-air runtime version is still 19\.0\.0, which has shipped/,
  );
});

test('only asks to record native changes before the version shipped', () => {
  const current = { ...recorded, ios: 'c' };
  const message = verdict(recorded, current, false);
  expect(message).toMatch(
    /^Native code changed \(ios\) before 19\.0\.0 shipped/,
  );
  expect(message).toContain(JSON.stringify(current, null, 2));
});

test('refuses a new runtime version without a native change', () => {
  expect(verdict(recorded, { ...recorded, runtimeVersion: '19.1.0' })).toMatch(
    /changed from 19\.0\.0 to 19\.1\.0 with no native change/,
  );
});

test('asks to record a new runtime version that comes with native changes', () => {
  const current = { runtimeVersion: '19.1.0', ios: 'c', android: 'd' };
  expect(verdict(recorded, current)).toContain(
    JSON.stringify(current, null, 2),
  );
});
