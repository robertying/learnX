// The line coverage table that scripts/checks/android-coverage.mjs and
// scripts/checks/native-coverage.mjs print.

const percent = (covered, executable) =>
  (executable ? (100 * covered) / executable : 100).toFixed(1).padStart(6);

const row = (covered, executable, label) =>
  `${percent(covered, executable)}%  ${String(covered).padStart(4)}/${String(executable).padEnd(4)}  ${label}`;

/**
 * One line per file, then the files no test run reached (`untested`: their
 * lines aren't known, so they aren't in the total), then the total.
 *
 * @param {{ path: string, covered: number, executable: number }[]} files
 * @param {string[]} [untested]
 * @returns {string[]}
 */
export const coverageTable = (files, untested = []) => {
  let covered = 0;
  let executable = 0;
  const lines = files.map(file => {
    covered += file.covered;
    executable += file.executable;
    return row(file.covered, file.executable, file.path);
  });
  const missing = untested.map(path => `${'untested'.padStart(18)}  ${path}`);
  const total = untested.length
    ? `total, without ${untested.length} untested`
    : 'total';
  return [...lines, ...missing, row(covered, executable, total)];
};
