// The native coverage tables: scripts/native-coverage.mjs reads xccov reports
// (scripts/test-ios.sh), scripts/android-coverage.mjs JaCoCo XML
// (scripts/test-android.sh). Both run against this checkout's sources.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = join(__dirname, '../..');

const run = (script: string, args: string[], input = '') =>
  execFileSync('node', [join(root, 'scripts', script), ...args], {
    cwd: root,
    encoding: 'utf8',
    input,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
    .trimEnd()
    .split('\n');

describe('native-coverage.mjs', () => {
  const file = (path: string, coveredLines: number, executableLines = 10) => ({
    path: join(root, path),
    coveredLines,
    executableLines,
  });
  const report = (...files: ReturnType<typeof file>[]) =>
    JSON.stringify({ targets: [{ files }] }, null, 2);

  const table = run(
    'native-coverage.mjs',
    [root],
    // Two runs back to back, as scripts/test-ios.sh pipes them
    report(
      file('ios/learnX/AppDelegate.swift', 4),
      file('modules/share/ios/ShareModule.swift', 9),
      // Not learnX's own: tests, pods and the widgets' layouts
      file('modules/share/ios/Tests/ShareModuleTests.swift', 10),
      file('ios/learnXTests/AppDelegateTests.swift', 10),
      file('ios/Pods/Some/Pod.swift', 10),
      file('ios/ExpoWidgetsTarget/UpNext.swift', 10),
    ) +
      report(
        file('ios/learnX/AppDelegate.swift', 8),
        file('modules/share/ios/ShareModule.swift', 2),
      ),
  );

  it("keeps each own file's best run", () => {
    expect(table).toContain('  80.0%     8/10    ios/learnX/AppDelegate.swift');
    expect(table).toContain(
      '  90.0%     9/10    modules/share/ios/ShareModule.swift',
    );
    expect(table.join('\n')).not.toMatch(/Tests|Pods|ExpoWidgetsTarget/);
  });

  it('names the own sources no report has, outside the total', () => {
    expect(table).toContain(
      '          untested  ios/learnX/SceneDelegate.swift',
    );
    expect(table).toContain(
      '          untested  ios/ShareExtension/ShareViewController.swift',
    );
    expect(table.at(-1)).toMatch(
      / 85\.0% +17\/20 +total, without \d+ untested$/,
    );
  });
});

describe('android-coverage.mjs', () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'android-coverage-'));
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  let report: string;
  beforeEach(() => {
    report = join(dir, 'report.xml');
    writeFileSync(
      report,
      `<report name="share"><package name="io/robertying/learnx/share">
        <class name="io/robertying/learnx/share/ShareModule"/>
        <sourcefile name="ShareModule.kt">
          <line nr="1" mi="0" ci="1"/>
          <counter type="INSTRUCTION" missed="5" covered="50"/>
          <counter type="LINE" missed="1" covered="9"/>
        </sourcefile>
        <sourcefile name="NoLines.kt"><counter type="METHOD" missed="0" covered="1"/></sourcefile>
      </package></report>`,
    );
  });

  it('lists each file of the reports, then the own Kotlin they miss', () => {
    const table = run('android-coverage.mjs', [report]);

    expect(table[0]).toBe(
      '  90.0%     9/10    io/robertying/learnx/share/ShareModule.kt',
    );
    expect(table).toContain(
      '          untested  android/app/src/main/java/io/robertying/learnx/MainActivity.kt',
    );
    expect(table.join('\n')).not.toContain('modules/share/');
    expect(table.at(-1)).toMatch(/total, without \d+ untested$/);
  });

  it('fails below the minimum it is given', () => {
    expect(run('android-coverage.mjs', ['--min=90', report])[0]).toMatch(
      /ShareModule\.kt$/,
    );
    expect(() => run('android-coverage.mjs', ['--min=95', report])).toThrow(
      /Line coverage 90\.0% is below the minimum, 95%\./,
    );
  });
});
