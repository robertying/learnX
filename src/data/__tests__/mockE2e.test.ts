import {
  mockAssignments,
  mockCourses,
  mockFiles,
  mockNotices,
} from 'data/mock';

// The Maestro flows find mock content by its text ('.*大作业1.*'), and they
// only run on a device. This catches a mock data edit that would break them.
// No Node types in this project: just the two calls used here.
declare const __dirname: string;
const fs: {
  readdirSync: (dir: string) => string[];
  readFileSync: (file: string, encoding: 'utf8') => string;
} = require('fs');
const { join }: { join: (...parts: string[]) => string } = require('path');

const maestroDir = join(__dirname, '../../../.maestro');

const contentPatterns = fs
  .readdirSync(maestroDir)
  .filter(name => name.endsWith('.yaml'))
  .flatMap(name =>
    [
      ...fs
        .readFileSync(join(maestroDir, name), 'utf8')
        .matchAll(/'\.\*([^'|]*\p{Script=Han}[^'|]*)\.\*'/gu),
    ].map(match => ({ flow: name, text: match[1] })),
  );

const mockText = JSON.stringify([
  mockCourses,
  mockNotices,
  mockAssignments,
  mockFiles,
]);

it('finds content patterns in the flows', () => {
  expect(contentPatterns.length).toBeGreaterThan(0);
});

it.each(contentPatterns)('$flow: "$text" is in the mock data', ({ text }) => {
  expect(mockText).toContain(text);
});
