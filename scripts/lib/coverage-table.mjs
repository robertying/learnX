// The line coverage table that scripts/android-coverage.mjs and
// scripts/native-coverage.mjs print.

const percent = (covered, executable) =>
  (executable ? (100 * covered) / executable : 100).toFixed(1).padStart(6);

const row = (covered, executable, label) =>
  `${percent(covered, executable)}%  ${String(covered).padStart(4)}/${String(executable).padEnd(4)}  ${label}`;

/**
 * One line per file, then the total.
 *
 * @param {{ path: string, covered: number, executable: number }[]} files
 * @returns {string[]}
 */
export const coverageTable = files => {
  let covered = 0;
  let executable = 0;
  const lines = files.map(file => {
    covered += file.covered;
    executable += file.executable;
    return row(file.covered, file.executable, file.path);
  });
  return [...lines, row(covered, executable, 'total')];
};
