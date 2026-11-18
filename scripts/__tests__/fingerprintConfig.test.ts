// fingerprint.config.js's hook: the build number that `pnpm bump` moves isn't
// part of the native fingerprint, so a bump keeps ota-fingerprint.json valid.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FileHookTransformFunction } from '@expo/fingerprint';

const { fileHookTransform } = require('../../fingerprint.config.js') as {
  fileHookTransform: FileHookTransformFunction;
};

/** The text the fingerprint hashes for a file read in `size`-byte chunks. */
const hashed = (filePath: string, text: string, size = 1024) => {
  const source = { type: 'file' as const, filePath };
  const data = Buffer.from(text);
  const out: (Buffer | string)[] = [];
  for (let i = 0; i < data.length; i += size) {
    const result = fileHookTransform(
      source,
      data.subarray(i, i + size),
      false,
      'utf8',
    );
    if (result !== null) {
      out.push(result);
    }
  }
  const last = fileHookTransform(source, null, true, 'utf8');
  if (last !== null) {
    out.push(last);
  }
  return out.map(String).join('');
};

const bumped = (text: string) =>
  text
    .replace(/(CURRENT_PROJECT_VERSION = )\d+/g, '$19999')
    .replace(/(versionCode = )\d+\n/, '$19209999\n');

it.each(['ios/learnX.xcodeproj/project.pbxproj', 'android/app/build.gradle'])(
  'hashes %s the same after a build bump',
  filePath => {
    const text = readFileSync(join(__dirname, '../..', filePath), 'utf8');
    expect(bumped(text)).not.toBe(text);
    // Small chunks split the build number's lines.
    expect(hashed(filePath, bumped(text), 7)).toBe(hashed(filePath, text));
    expect(hashed(filePath, text)).not.toMatch(
      /CURRENT_PROJECT_VERSION = \d|versionCode = \d+\n/,
    );
  },
);

it('keeps the rest of those files', () => {
  expect(
    hashed(
      'android/app/build.gradle',
      'a\n        versionCode = 9204555\n        versionName = "19.0.0"\n',
    ),
  ).toBe('a\n        versionName = "19.0.0"\n');
});

it('passes other files through as they come', () => {
  const chunk = Buffer.from('CURRENT_PROJECT_VERSION = 1;\n');
  const source = { type: 'file' as const, filePath: 'ios/Podfile' };
  expect(fileHookTransform(source, chunk, false, 'utf8')).toBe(chunk);
  expect(fileHookTransform(source, null, true, 'utf8')).toBeNull();
  expect(
    fileHookTransform({ type: 'contents', id: 'x' }, 'text', true, 'utf8'),
  ).toBe('text');
});
