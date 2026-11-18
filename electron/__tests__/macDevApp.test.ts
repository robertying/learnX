import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { APP_ID, hashFolder, renames } from '../macDevApp.ts';

describe('renames', () => {
  it('names the app, its executable and its helpers learnX', () => {
    const plan = renames();
    expect(plan.executable).toEqual({
      from: 'MacOS/Electron',
      to: 'MacOS/learnX',
    });
    expect(plan.plist).toMatchObject({
      CFBundleName: 'learnX',
      CFBundleDisplayName: 'learnX',
      CFBundleExecutable: 'learnX',
      CFBundleIdentifier: APP_ID,
      // No Dock icon until main.ts says (E2E runs never get one).
      LSUIElement: '1',
    });
    expect(plan.helpers.map(helper => helper.to)).toEqual([
      'Frameworks/learnX Helper.app',
      'Frameworks/learnX Helper (GPU).app',
      'Frameworks/learnX Helper (Renderer).app',
      'Frameworks/learnX Helper (Plugin).app',
    ]);
    for (const helper of plan.helpers) {
      expect(helper.from).toBe(helper.to.replace('learnX', 'Electron'));
      expect(helper.plist.CFBundleExecutable).toBe(helper.executable.to);
      expect(helper.plist.CFBundleIdentifier).toBe(`${APP_ID}.helper`);
    }
  });
});

describe('hashFolder', () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'learnx-icon-'));
    fs.mkdirSync(path.join(dir, 'Assets'));
    fs.writeFileSync(path.join(dir, 'icon.json'), '{}');
    fs.writeFileSync(path.join(dir, 'Assets', 'a.svg'), '<svg/>');
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('changes when a file or a name changes, and only then', () => {
    const first = hashFolder(dir);
    expect(hashFolder(dir)).toBe(first);
    fs.writeFileSync(path.join(dir, 'Assets', 'a.svg'), '<svg></svg>');
    const second = hashFolder(dir);
    expect(second).not.toBe(first);
    fs.renameSync(
      path.join(dir, 'Assets', 'a.svg'),
      path.join(dir, 'Assets', 'b.svg'),
    );
    expect(hashFolder(dir)).not.toBe(second);
  });
});
