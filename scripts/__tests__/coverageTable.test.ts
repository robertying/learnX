// The line coverage table of scripts/android-coverage.mjs and
// scripts/native-coverage.mjs.
import { coverageTable } from '../lib/coverage-table.mjs';

it('lists each file, then the total', () => {
  expect(
    coverageTable([
      { path: 'ios/A.swift', covered: 6, executable: 8 },
      { path: 'modules/B.swift', covered: 0, executable: 0 },
    ]),
  ).toEqual([
    '  75.0%     6/8     ios/A.swift',
    ' 100.0%     0/0     modules/B.swift',
    '  75.0%     6/8     total',
  ]);
});

it('counts nothing as fully covered', () => {
  expect(coverageTable([])).toEqual([' 100.0%     0/0     total']);
});
