// Prints the line coverage per source file from JaCoCo XML reports (the
// paths given), and names learnX's own Kotlin (the app's and the local
// modules') that no report has. Run from the repo root by
// scripts/test-android.sh.
//
//   node scripts/android-coverage.mjs [--min=<percent>] <report.xml>[#<package>]...
//
// With --min, it fails when the total line coverage is below that percent.
// A report followed by #<package> (io/robertying/learnx/dialog) counts only
// that package and the ones in it: the app module's report also covers its
// startup code, which no test runs.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { coverageTable } from './lib/coverage-table.mjs';

const args = process.argv.slice(2);
const minArg = args.find(arg => arg.startsWith('--min='));
const min = minArg ? Number(minArg.slice('--min='.length)) : 0;

const files = [];
for (const arg of args.filter(a => a !== minArg)) {
  const [path, only] = arg.split('#');
  const xml = readFileSync(path, 'utf8');
  for (const pkg of xml.matchAll(
    /<package name="([^"]*)">([\s\S]*?)<\/package>/g,
  )) {
    if (only && pkg[1] !== only && !pkg[1].startsWith(`${only}/`)) continue;
    for (const file of pkg[2].matchAll(
      /<sourcefile name="([^"]*)">([\s\S]*?)<\/sourcefile>/g,
    )) {
      const line =
        /<counter type="LINE" missed="(\d+)" covered="(\d+)"\/>/.exec(file[2]);
      if (!line) continue;
      const covered = Number(line[2]);
      files.push({
        path: `${pkg[1]}/${file[1]}`,
        covered,
        executable: covered + Number(line[1]),
      });
    }
  }
}
// A report names a file by its package path (io/robertying/learnx/X.kt).
const untested = execFileSync(
  'git',
  ['ls-files', 'modules/*/android/src/main/*.kt', 'android/app/src/main/*.kt'],
  { encoding: 'utf8' },
)
  .split('\n')
  .filter(path => path && !files.some(file => path.endsWith(`/${file.path}`)));

console.log(coverageTable(files, untested).join('\n'));

const covered = files.reduce((sum, file) => sum + file.covered, 0);
const executable = files.reduce((sum, file) => sum + file.executable, 0);
const percent = executable ? (100 * covered) / executable : 100;
if (percent < min) {
  console.error(
    `Line coverage ${percent.toFixed(1)}% is below the minimum, ${min}%.`,
  );
  process.exitCode = 1;
}
