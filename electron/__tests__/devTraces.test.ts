import { devRunRegistrations, isDevRunName } from '../devTraces.mjs';

describe('isDevRunName', () => {
  it.each([
    'io.robertying.learnXElectron',
    'io.robertying.learnXElectron.plist',
    'io.robertying.learnXElectron.savedState',
    'io.robertying.learnXElectron.helper',
    'com.github.Electron',
    'com.github.Electron.plist',
    'com.github.Electron.ShipIt',
    'learnX',
  ])('takes %s', name => {
    expect(isDevRunName(name)).toBe(true);
  });

  it.each([
    'io.robertying.learnX',
    'io.robertying.learnX.plist',
    'io.robertying.learnX.ShareExtension',
    'io.robertying.learnXTests',
    'io.robertying.learnXElectronOther',
    'com.github.ElectronOther',
    'learnX-e2e',
    'Electron',
  ])('leaves %s', name => {
    expect(isDevRunName(name)).toBe(false);
  });
});

describe('devRunRegistrations', () => {
  const root = '/repo/learnX';
  const dump = [
    'bundle id:                  1234',
    `path:                       ${root}/build/electron/learnX.app (0x5704)`,
    `path:                       ${root}/node_modules/.pnpm/electron@45.3.2/node_modules/electron/dist/Electron.app (0x12)`,
    `path:                       ${root}/electron/node_modules/electron/dist/Electron.app`,
    `path:                       ${root}/build/electron/learnX.app (0x5705)`,
    'path:                       /repo/other/build/electron/learnX.app (0x1)',
    'path:                       /Applications/learnX.app (0x2)',
    `path:                       ${root}/build/electron/web (0x3)`,
  ].join('\n');

  it("finds this checkout's learnX.app and Electron.app, once each", () => {
    expect(devRunRegistrations(dump, root)).toEqual([
      `${root}/build/electron/learnX.app`,
      `${root}/node_modules/.pnpm/electron@45.3.2/node_modules/electron/dist/Electron.app`,
      `${root}/electron/node_modules/electron/dist/Electron.app`,
    ]);
  });
});
