import { readFileSync } from 'node:fs';
import path from 'node:path';
import { MARKERS, problems } from '../check-bundle-platform.mjs';

const src = (file: string) =>
  readFileSync(path.join(__dirname, '..', '..', 'src', file), 'utf8');

it('finds the Electron app’s modules in either phone’s bundle', () => {
  for (const platform of ['ios', 'android']) {
    expect(problems(platform, 'a buildDesktopICS b')).toEqual([
      'buildDesktopICS',
    ]);
  }
  expect(problems('ios', 'x')).toEqual([]);
});

it('finds Compose only in the iOS bundle', () => {
  const bundle = 'Object.defineProperty(e,"OutlinedTextField",{})';
  expect(problems('ios', bundle)).toEqual(['"OutlinedTextField"']);
  expect(problems('android', bundle)).toEqual([]);
});

// A marker that's no longer in its module would let it through unnoticed.
it.each([
  ['web/bridge.ts', MARKERS.electron[0]],
  ['theme/electron.ts', 'buildElectronColors'],
  ['theme/electron.ts', 'electronSystemColors'],
  ['services/calendar/desktopExport.ts', 'buildDesktopICS'],
  ['services/files/desktop.ts', 'saveTextAs'],
])('%s still has %s', (file, marker) => {
  expect(src(file)).toContain(marker);
});
