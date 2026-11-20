// Every patch in patches/ comes with tests of what it changes, listed under
// "Tested by" in its section of patches/README.md. These checks keep the
// sections in step with the patches and the tests they name, and the comments
// that name a patch file in step with its version.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '../..');
const patchesDir = join(root, 'patches');

// pnpm names a patch <name>@<version>.patch, with a scoped package's "/" as "__".
const patched = readdirSync(patchesDir)
  .filter(name => name.endsWith('.patch'))
  .map(name => name.replace(/@[^@]+\.patch$/, '').replace('__', '/'));

// A section is a "## `<package>`" heading, what the patch changes, "Drop
// when" and "Tested by".
const sections = readFileSync(join(patchesDir, 'README.md'), 'utf8')
  .split(/^## /m)
  .slice(1)
  .map(section => ({
    name: /^`([^`]+)`$/m.exec(section)?.[1] ?? section.split('\n')[0],
    testedBy: /^\*\*Tested by:\*\* (.*)$/m.exec(section)?.[1] ?? '',
  }));

it('has a section for every patch, and no other', () => {
  expect(sections.map(section => section.name).sort()).toEqual(
    [...patched].sort(),
  );
});

it.each(sections)('names how $name is tested, and the tests exist', row => {
  expect(row.testedBy).not.toBe('');
  const paths = [...row.testedBy.matchAll(/`([^`]+\/[^`]*)`/g)].map(
    match => match[1],
  );
  expect(paths.filter(path => !existsSync(join(root, path)))).toEqual([]);
});

// A patch file's name carries the package's version, so upgrading a package
// renames it. changedFiles.test.ts only uses patch names as sample paths.
it('names only patch files that exist', () => {
  const named = execFileSync(
    'git',
    [
      'grep',
      '--no-color',
      '-hoE',
      'patches/[A-Za-z0-9@_.+-]+\\.patch',
      '--',
      '.',
      ':!scripts/__tests__/changedFiles.test.ts',
    ],
    { cwd: root, encoding: 'utf8' },
  )
    .split('\n')
    .filter(Boolean);
  expect(named.length).toBeGreaterThan(0);
  expect(
    [...new Set(named)].filter(path => !existsSync(join(root, path))),
  ).toEqual([]);
});
