// Prints the line coverage per source file from JaCoCo XML reports (the
// paths given). Used by scripts/test-android.sh.
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
console.log(coverageTable(files).join('\n'));
