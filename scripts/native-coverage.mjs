// Prints a line coverage table of learnX's own native sources from the
// `xcrun xccov view --report --json` reports on stdin (one or more, back to
// back), keeping each file's best run. Used by scripts/test-ios.sh.
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';

const root = process.argv[2] ?? process.cwd();
const input = readFileSync(0, 'utf8');

// The reports are concatenated JSON objects; split them at the top level.
const reports = [];
let depth = 0;
let start = -1;
let inString = false;
for (let i = 0; i < input.length; i++) {
  const char = input[i];
  if (inString) {
    if (char === '\\') i++;
    else if (char === '"') inString = false;
  } else if (char === '"') inString = true;
  else if (char === '{') {
    if (depth++ === 0) start = i;
  } else if (char === '}' && --depth === 0) {
    reports.push(JSON.parse(input.slice(start, i + 1)));
  }
}

const own = path =>
  (path.startsWith('modules/') || path.startsWith('ios/')) &&
  !path.includes('/Tests/') &&
  !path.startsWith('ios/learnXTests/') &&
  !path.startsWith('ios/Pods/') &&
  path.endsWith('.swift');

const files = new Map();
for (const report of reports) {
  for (const target of report.targets ?? []) {
    for (const file of target.files ?? []) {
      const path = relative(root, file.path);
      if (!own(path)) continue;
      const best = files.get(path);
      if (!best || file.coveredLines > best.coveredLines) files.set(path, file);
    }
  }
}

let covered = 0;
let executable = 0;
const rows = [...files.entries()].sort(([a], [b]) => a.localeCompare(b));
for (const [path, file] of rows) {
  covered += file.coveredLines;
  executable += file.executableLines;
  const percent = file.executableLines
    ? (100 * file.coveredLines) / file.executableLines
    : 100;
  console.log(
    `${percent.toFixed(1).padStart(6)}%  ${String(file.coveredLines).padStart(4)}/${String(file.executableLines).padEnd(4)}  ${path}`,
  );
}
const total = executable ? (100 * covered) / executable : 100;
console.log(
  `${total.toFixed(1).padStart(6)}%  ${String(covered).padStart(4)}/${String(executable).padEnd(4)}  total`,
);
