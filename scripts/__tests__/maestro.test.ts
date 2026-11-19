// The Maestro flows only run on a device, and Maestro reports a missing
// subflow or a misnamed flow in the run order only once it gets there. These
// checks catch both on every push.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const maestroDir = join(__dirname, '../../.maestro');

const read = (path: string) => readFileSync(path, 'utf8');
const flows = readdirSync(maestroDir, { recursive: true, encoding: 'utf8' })
  .filter(name => /\.(ya?ml|js)$/.test(name))
  .map(name => join(maestroDir, name));

/** The `name:` in a flow's header, before its `---`. */
const flowName = (path: string) =>
  /^name: (.+)$/m.exec(read(path).split(/^---$/m)[0])?.[1].trim();

describe('config.yaml', () => {
  const config = read(join(maestroDir, 'config.yaml'));
  const order = [
    ...(
      /flowsOrder:\n((?:\s+(?:- .*|#.*)\n)+)/.exec(config)?.[1] ?? ''
    ).matchAll(/^\s+- (.+)$/gm),
  ].map(match => match[1].trim());
  // The flows a plain run takes (`flows: ['*']`): the top level only.
  const topLevel = readdirSync(maestroDir)
    .filter(name => name.endsWith('.yaml') && name !== 'config.yaml')
    .map(name => flowName(join(maestroDir, name)));

  it('lists flows in its run order', () => {
    expect(order.length).toBeGreaterThan(0);
  });

  // executionOrder matches by name; a renamed flow would drop out of the
  // order and run after the logout.
  it.each(order)('runs "%s", a top-level flow', name => {
    expect(topLevel).toContain(name);
  });
});

describe('flow references', () => {
  const references = flows
    .filter(path => /\.ya?ml$/.test(path))
    .flatMap(path =>
      [
        ...read(path).matchAll(
          /^\s*-?\s*(?:runFlow|runScript|file): ['"]?([\w./-]+\.(?:ya?ml|js))['"]?\s*$/gm,
        ),
      ].map(match => ({
        from: relative(maestroDir, path),
        name: match[1],
        target: join(dirname(path), match[1]),
      })),
    );

  it('finds references', () => {
    expect(references.length).toBeGreaterThan(0);
  });

  it.each(references)(
    '$from runs a file that exists: $target',
    ({ target }) => {
      expect(flows).toContain(target);
    },
  );
});

// The patched Maestro (scripts/e2e/maestro): build.sh applies the patches in
// the order it lists them, and README.md says what each one is for. A patch
// added to the folder but not to the list would never be applied.
describe('patched Maestro', () => {
  const patchDir = join(__dirname, '../e2e/maestro');
  const patches = readdirSync(patchDir)
    .filter(name => name.endsWith('.patch'))
    .sort();
  const applied = [
    ...read(join(patchDir, 'build.sh')).matchAll(
      /"\$here\/(maestro-[\w-]+\.patch)"/g,
    ),
  ].map(match => match[1]);
  const readme = read(join(patchDir, 'README.md'));

  it('has patches', () => {
    expect(patches.length).toBeGreaterThan(0);
  });

  it('applies each patch once in build.sh', () => {
    expect([...applied].sort()).toEqual(patches);
  });

  it.each(patches)('describes %s in README.md', name => {
    expect(readme).toContain(`\`${name}\``);
  });
});
