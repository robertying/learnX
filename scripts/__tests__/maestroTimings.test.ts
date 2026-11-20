import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const script = join(__dirname, '../e2e/maestro-timings.mjs');

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'maestro-timings-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const entry = (
  command: Record<string, unknown>,
  timestamp: number,
  duration: number,
  depth: number,
  status = 'COMPLETED',
) => ({ command, metadata: { timestamp, duration, depth, status } });

const flow = (name: string, entries: unknown[]) => {
  mkdirSync(join(dir, name));
  writeFileSync(join(dir, name, 'commands.json'), JSON.stringify(entries));
};

const run = () =>
  execFileSync('node', [script, dir, '5'], { encoding: 'utf8' });

it("prints each flow's time and the commands' own time", () => {
  flow('Open a notice', [
    { command: { defineVariablesCommand: {} } },
    entry({ launchAppCommand: {} }, 1000, 2000, 0),
    // A subflow: its defineVariables at its own depth, then its commands.
    entry(
      { runFlowCommand: { sourceDescription: 'open.yaml' } },
      3000,
      1500,
      0,
    ),
    entry({ defineVariablesCommand: {} }, 3000, 0, 0),
    entry({ tapOnElement: { selector: { idRegex: 'card' } } }, 3000, 1000, 1),
    // A condition that waited out the lookup timeout, then skipped.
    entry(
      { runFlowCommand: { condition: { notVisible: { idRegex: 'list' } } } },
      4500,
      7000,
      0,
      'SKIPPED',
    ),
  ]);
  flow('Not a flow', []);

  const out = run();

  expect(out).toContain('   10.5 s  Open a notice');
  expect(out).toContain('   10.5 s  all flows');
  expect(out).not.toContain('Not a flow');
  expect(out).toMatch(/ 7\.0 s +1 {2}runFlowCommand \(skipped\)\n/);
  expect(out).toContain(
    '    7.0 s     1  runFlowCommand {"notVisible":{"idRegex":"list"}} (skipped)',
  );
  // The subflow's own time leaves out its tap.
  expect(out).toContain('    0.5 s     1  runFlowCommand [open.yaml]');
  expect(out).toContain('    1.0 s     1  tapOnElement {"idRegex":"card"}');
});

it('needs a run folder', () => {
  expect(() =>
    execFileSync('node', [script], { encoding: 'utf8', stdio: 'pipe' }),
  ).toThrow(/usage/);
});

it('reads the latest run of a test output folder', () => {
  // Maestro puts each run in a timestamped folder of --test-output-dir.
  const output = dir;
  dir = join(output, '2026-11-20_014512');
  mkdirSync(dir);
  flow('Older run', [entry({ launchAppCommand: {} }, 0, 1000, 0)]);
  dir = join(output, '2026-11-20_020102');
  mkdirSync(dir);
  flow('Show no results and failures', [
    entry({ launchAppCommand: {} }, 0, 4000, 0),
  ]);
  dir = output;

  const out = run();

  expect(out).toContain(`Run ${join(output, '2026-11-20_020102')}`);
  expect(out).toContain('    4.0 s  Show no results and failures');
  expect(out).not.toContain('Older run');
});
