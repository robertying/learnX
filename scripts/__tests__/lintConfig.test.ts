// Settings in .oxlintrc.json that have to follow the installed packages.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '../..');

it("gives Oxlint's React rules the installed React version", () => {
  const config = readFileSync(join(root, '.oxlintrc.json'), 'utf8');
  const react = JSON.parse(
    readFileSync(join(root, 'node_modules/react/package.json'), 'utf8'),
  ) as { version: string };
  expect(/"react":\s*\{\s*"version":\s*"([^"]+)"/.exec(config)?.[1]).toBe(
    react.version,
  );
});
