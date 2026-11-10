// Prints the line coverage per source file from JaCoCo XML reports (the
// paths given). Used by scripts/test-android.sh.
import { readFileSync } from 'node:fs';

let covered = 0;
let executable = 0;
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
      const fileCovered = Number(line[2]);
      const fileExecutable = fileCovered + Number(line[1]);
      covered += fileCovered;
      executable += fileExecutable;
      const percent = fileExecutable
        ? (100 * fileCovered) / fileExecutable
        : 100;
      console.log(
        `${percent.toFixed(1).padStart(6)}%  ${String(fileCovered).padStart(4)}/${String(fileExecutable).padEnd(4)}  ${pkg[1]}/${file[1]}`,
      );
    }
  }
}
const total = executable ? (100 * covered) / executable : 100;
console.log(
  `${total.toFixed(1).padStart(6)}%  ${String(covered).padStart(4)}/${String(executable).padEnd(4)}  total`,
);
