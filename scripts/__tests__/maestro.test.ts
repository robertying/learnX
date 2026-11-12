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

// scripts/store-screenshots.sh copies this one over subflows/screenshot.yaml,
// so it runs from there.
const runsFrom = (path: string) =>
  path.endsWith('/store/subflows/screenshot-posture.yaml')
    ? join(maestroDir, 'subflows')
    : dirname(path);

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
        target: join(runsFrom(path), match[1]),
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
