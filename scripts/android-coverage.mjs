// Prints the line coverage per source file from JaCoCo XML reports (the
// paths given), and names learnX's own Kotlin (the app's and the local
// modules') that no report has. Run from the repo root by
// scripts/test-android.sh.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { coverageTable } from './lib/coverage-table.mjs';

const files = [];
for (const path of process.argv.slice(2)) {
  const xml = readFileSync(path, 'utf8');
  for (const pkg of xml.matchAll(
    /<package name="([^"]*)">([\s\S]*?)<\/package>/g,
  )) {
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
