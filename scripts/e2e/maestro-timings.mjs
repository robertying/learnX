// Says where a Maestro run's time went, from the commands.json Maestro writes
// for each flow in its test output folder (--test-output-dir, which
// scripts/e2e/e2e.sh and e2e-devices.sh pass):
//
//   node scripts/e2e/maestro-timings.mjs <run folder> [how many commands]
//
// The run folder is the one holding a folder per flow. It prints each flow's
// time, then the time each kind of command took and the commands that took
// longest, both by their own time: a runFlow's or repeat's own time is
// checking its `when` or `while` condition, its commands' time is counted
// under them. A `visible` / `notVisible` condition that waits out Maestro's
// lookup timeout (7 s) shows up here as a slow skipped runFlow or repeat.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const [dir, topArg] = process.argv.slice(2);
if (!dir) {
  console.error(
    'usage: node scripts/e2e/maestro-timings.mjs <run folder> [count]',
  );
  process.exit(1);
}
const top = Number(topArg ?? 20);

const kindOf = command => Object.keys(command)[0];

/** The command as it ran: its subflow, or what it looked for. */
const describe = (command, metadata) => {
  const kind = kindOf(command);
  const ran = metadata.evaluatedCommand?.[kind] ?? command[kind];
  const what = ran.condition ?? ran.selector;
  return [
    kind,
    ran.sourceDescription && `[${ran.sourceDescription}]`,
    what && JSON.stringify(what).slice(0, 120),
  ]
    .filter(Boolean)
    .join(' ');
};

const add = (totals, key, ms) => {
  const total = totals.get(key) ?? { ms: 0, count: 0 };
  total.ms += ms;
  total.count += 1;
  totals.set(key, total);
};

const flows = [];
const byKind = new Map();
const byCommand = new Map();
for (const name of readdirSync(dir).sort()) {
  const file = join(dir, name, 'commands.json');
  if (!existsSync(file)) {
    continue;
  }
  const entries = JSON.parse(readFileSync(file, 'utf8')).filter(
    entry => entry.metadata,
  );
  if (entries.length === 0) {
    continue;
  }
  const first = entries[0].metadata;
  const last = entries.at(-1).metadata;
  flows.push([name, last.timestamp + (last.duration ?? 0) - first.timestamp]);
  entries.forEach(({ command, metadata }, i) => {
    const depth = metadata.depth ?? 0;
    // Commands one level deeper, up to the next at this depth, are its own.
    // A subflow's defineVariables sits at its runFlow's depth, before them.
    let inner = 0;
    for (const next of entries.slice(i + 1)) {
      const nextDepth = next.metadata.depth ?? 0;
      if (
        nextDepth === depth &&
        kindOf(next.command) === 'defineVariablesCommand'
      ) {
        continue;
      }
      if (nextDepth <= depth) {
        break;
      }
      if (nextDepth === depth + 1) {
        inner += next.metadata.duration ?? 0;
      }
    }
    const own = Math.max(0, (metadata.duration ?? 0) - inner);
    const kind = `${kindOf(command)}${metadata.status === 'SKIPPED' ? ' (skipped)' : ''}`;
    add(byKind, kind, own);
    add(
      byCommand,
      `${describe(command, metadata)}${metadata.status === 'SKIPPED' ? ' (skipped)' : ''}`,
      own,
    );
  });
}

const seconds = ms => `${(ms / 1000).toFixed(1).padStart(7)} s`;
const sorted = totals => [...totals].sort((a, b) => b[1].ms - a[1].ms);

console.log('Flows');
for (const [name, ms] of flows) {
  console.log(`${seconds(ms)}  ${name}`);
}
console.log(
  `${seconds(flows.reduce((sum, [, ms]) => sum + ms, 0))}  all flows`,
);
console.log('\nOwn time by kind of command (time, count)');
for (const [kind, { ms, count }] of sorted(byKind)) {
  console.log(`${seconds(ms)} ${String(count).padStart(5)}  ${kind}`);
}
console.log(`\nThe ${top} commands that took longest (time, count)`);
for (const [command, { ms, count }] of sorted(byCommand).slice(0, top)) {
  console.log(`${seconds(ms)} ${String(count).padStart(5)}  ${command}`);
}
