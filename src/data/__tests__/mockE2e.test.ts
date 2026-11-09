import fs from 'fs';
import path from 'path';
import {
  mockAssignments,
  mockCourses,
  mockFiles,
  mockNotices,
} from 'data/mock';

// The Maestro flows find mock content by its text ('.*大作业1.*'), and they
// only run on a device. This catches a mock data edit that would break them.
const maestroDir = path.join(__dirname, '../../../.maestro');

const contentPatterns = fs
  .readdirSync(maestroDir)
  .filter(name => name.endsWith('.yaml'))
  .flatMap(name =>
    [
      ...fs
        .readFileSync(path.join(maestroDir, name), 'utf8')
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
