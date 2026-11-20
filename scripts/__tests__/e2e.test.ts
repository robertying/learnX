// scripts/e2e/e2e.sh hands its arguments to Maestro for the flows and to
// xcodebuild for the UI tests (--ui), and E2E_SCREENSHOTS adds Maestro's output
// folder to them. It runs in a copy of its scripts with a made-up .env, where
// `maestro`, `xcodebuild`, `xcrun` and `node` are stand-ins that log their
// arguments.
import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const scripts = join(__dirname, '../e2e');

let dir: string;

const stub = (name: string, body: string) => {
  writeFileSync(join(dir, 'bin', name), `#!/bin/bash\n${body}\n`);
  chmodSync(join(dir, 'bin', name), 0o755);
};

/** Each stand-in's calls, one line of arguments per call. */
const calls = (name: string) => {
  const log = join(dir, `${name}.log`);
  return existsSync(log)
    ? readFileSync(log, 'utf8').split('\n').filter(Boolean)
    : [];
};

const run = (args: string[], env: Record<string, string> = {}) =>
  execFileSync('bash', [join(dir, 'scripts/e2e/e2e.sh'), ...args], {
    env: {
      ...process.env,
      PATH: `${join(dir, 'bin')}:${process.env.PATH}`,
      MAESTRO_DEVICE: 'SIM',
      DERIVED_DATA: join(dir, 'DerivedData', 'learnX-e2e'),
      E2E_SCREENSHOTS: 'shots',
      ...env,
    },
    stdio: 'ignore',
  });

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'e2e-'));
  mkdirSync(join(dir, 'scripts/e2e/lib'), { recursive: true });
  mkdirSync(join(dir, 'bin'));
  copyFileSync(join(scripts, 'e2e.sh'), join(dir, 'scripts/e2e/e2e.sh'));
  copyFileSync(
    join(scripts, 'lib/env.sh'),
    join(dir, 'scripts/e2e/lib/env.sh'),
  );
  mkdirSync(join(dir, 'scripts/lib'));
  copyFileSync(
    join(scripts, '../lib/derived-data.sh'),
    join(dir, 'scripts/lib/derived-data.sh'),
  );
  writeFileSync(
    join(dir, '.env'),
    'DUMMY_USERNAME=user\nDUMMY_PASSWORD=pass\n',
  );
  stub('node', 'echo T_KEY=value');
  stub('maestro', `echo "$*" >> "${dir}/maestro.log"`);
  // Makes the result bundle, as a test run does.
  stub(
    'xcodebuild',
    `echo "$*" >> "${dir}/xcodebuild.log"
while [ $# -gt 0 ]; do
  [ "$1" = -resultBundlePath ] && mkdir -p "$2"
  shift
done`,
  );
  stub(
    'xcrun',
    `case "$1" in
simctl) printf -- '-- iOS 27.2 --\\n    iPhone (SIM) (Booted)\\n' ;;
xcresulttool) echo "$*" >> "${dir}/xcresulttool.log" ;;
esac`,
  );
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

test('--ui gives xcodebuild only its own arguments and exports the attachments', () => {
  run(['ios', '--ui', '-only-testing:learnXUITests/TodayUITests']);

  expect(calls('maestro')).toEqual([]);
  const [xcodebuild] = calls('xcodebuild');
  expect(xcodebuild).not.toContain('--test-output-dir');
  expect(xcodebuild).toContain('-only-testing:learnXUITests/TodayUITests');
  expect(calls('xcresulttool')).toEqual([
    'xcresulttool export attachments --path build/e2e/ios-ui.xcresult --output-path shots/ui-tests',
  ]);
  // It took its turn with the DerivedData folder and let go of it
  // (scripts/lib/derived-data.sh).
  expect(existsSync(join(dir, 'DerivedData', 'learnX-e2e.lock'))).toBe(false);
});

test('a flow run gives Maestro its output folder and runs no UI tests', () => {
  run(['ios', '.maestro/04-tabs.yaml']);

  const [maestro] = calls('maestro');
  expect(maestro).toContain('--test-output-dir shots/.maestro');
  expect(maestro).toContain('.maestro/04-tabs.yaml');
  expect(calls('xcodebuild')).toEqual([]);
});

test('a full run keeps the output folder to Maestro and exports the UI tests’ attachments', () => {
  run(['ios']);

  expect(calls('maestro')[0]).toContain('--test-output-dir shots/.maestro');
  expect(calls('xcodebuild')[0]).not.toContain('--test-output-dir');
  expect(calls('xcresulttool')).toHaveLength(1);
});

test('without E2E_SCREENSHOTS, nothing is exported', () => {
  run(['ios', '--ui'], { E2E_SCREENSHOTS: '' });

  expect(calls('xcodebuild')).toHaveLength(1);
  expect(calls('xcresulttool')).toEqual([]);
});

describe('the PDF pinch flow (.maestro/pinch)', () => {
  beforeEach(() => {
    stub('adb', 'true');
  });

  test('runs after the flows on Android, on a Maestro built with the pinch patch', () => {
    // As scripts/e2e/maestro/build.sh lists them, beside its bin folder.
    writeFileSync(
      join(dir, 'learnx-patches'),
      'maestro-display.patch\nmaestro-pinch.patch\n',
    );
    run(['android', '--format', 'junit', '--output', 'report.xml']);

    const [flows, pinch] = calls('maestro');
    expect(flows).toContain('--output report.xml');
    expect(flows).toMatch(/ \.maestro$/);
    // Its own run: the flows' report stays theirs.
    expect(pinch).not.toContain('--output');
    expect(pinch).toContain('--test-output-dir shots/.maestro');
    expect(pinch).toMatch(/ \.maestro\/pinch\/zoom-pdf\.yaml$/);
  });

  test("doesn't run on a Maestro release, on iOS or with flows named", () => {
    run(['android']);
    expect(calls('maestro')).toHaveLength(1);

    writeFileSync(join(dir, 'learnx-patches'), 'maestro-pinch.patch\n');
    rmSync(join(dir, 'maestro.log'));
    run(['android', '.maestro/09-downloads.yaml']);
    expect(calls('maestro')).toHaveLength(1);

    rmSync(join(dir, 'maestro.log'));
    run(['ios'], { E2E_UI_TESTS: '0' });
    expect(calls('maestro')).toHaveLength(1);
  });
});
