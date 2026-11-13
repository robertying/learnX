// Every patch in patches/ comes with tests of what it changes, listed in the
// "Tested by" column of patches/README.md. These checks keep the table in step
// with the patches and the tests it names.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '../..');
const patchesDir = join(root, 'patches');

// pnpm names a patch <name>@<version>.patch, with a scoped package's "/" as "__".
const patched = readdirSync(patchesDir)
  .filter(name => name.endsWith('.patch'))
  .map(name => name.replace(/@[^@]+\.patch$/, '').replace('__', '/'));

const rows = readFileSync(join(patchesDir, 'README.md'), 'utf8')
  .split('\n')
  .filter(line => line.startsWith('| `'))
  .map(line => {
    const cells = line.split('|').map(cell => cell.trim());
    return { name: cells[1].replace(/`/g, ''), testedBy: cells.at(-2)! };
  });

it('has a row for every patch, and no other', () => {
  expect(rows.map(row => row.name).sort()).toEqual([...patched].sort());
});

it.each(rows)('names how $name is tested, and the tests exist', row => {
  expect(row.testedBy).not.toBe('');
  const paths = [...row.testedBy.matchAll(/`([^`]+\/[^`]*)`/g)].map(
    match => match[1],
  );
  expect(paths.filter(path => !existsSync(join(root, path)))).toEqual([]);
});
