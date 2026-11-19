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

/**
 * The `--min=<percent>` among a script's arguments (0 without one), and the
 * other arguments.
 *
 * @param {string[]} args
 * @returns {{ min: number, rest: string[] }}
 */
export const minArg = args => {
  const arg = args.find(a => a.startsWith('--min='));
  return {
    min: arg ? Number(arg.slice('--min='.length)) : 0,
    rest: args.filter(a => a !== arg),
  };
};

/**
 * Fails the process (exit code 1, after the table) when the files' total line
 * coverage is below `min` percent.
 *
 * @param {{ covered: number, executable: number }[]} files
 * @param {number} min
 */
export const checkMinimum = (files, min) => {
  const covered = files.reduce((sum, file) => sum + file.covered, 0);
  const executable = files.reduce((sum, file) => sum + file.executable, 0);
  const total = executable ? (100 * covered) / executable : 100;
  if (total < min) {
    console.error(
      `Line coverage ${total.toFixed(1)}% is below the minimum, ${min}%.`,
    );
    process.exitCode = 1;
  }
};
