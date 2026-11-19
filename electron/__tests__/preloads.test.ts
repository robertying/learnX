import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { PRELOADS, stripPreloads, stripTypes } from '../preloads.ts';

it('strips types, leaving the code where it was', () => {
  const source = [
    "import type { Bridge } from './bridge.ts';",
    'const value: number = 1;',
    'const run = (code: string | undefined): void => {};',
  ].join('\n');
  const code = stripTypes(source);
  expect(code.split('\n')).toHaveLength(3);
  expect(code).not.toMatch(/Bridge|number|string|void/);
  expect(code).toMatch(/const value\s+= 1;/);
});

it('writes each preload as a script a sandboxed renderer runs', () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'learnx-preloads-'));
  try {
    stripPreloads(outDir);
    expect(fs.readdirSync(outDir).sort()).toEqual(
      PRELOADS.map(({ output }) => output).sort(),
    );
    for (const { output } of PRELOADS) {
      const code = fs.readFileSync(path.join(outDir, output), 'utf8');
      // A CommonJS script: no import or export left, and it compiles.
      expect(code).not.toMatch(/^\s*(import|export)\b/m);
      expect(() => new vm.Script(code)).not.toThrow();
    }
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
});

it('leaves a preload already as stripped alone', () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'learnx-preloads-'));
  try {
    stripPreloads(outDir);
    const [, stale] = PRELOADS.map(({ output }) => path.join(outDir, output));
    fs.writeFileSync(stale, 'stale');
    const renameSync = jest.spyOn(fs, 'renameSync');
    try {
      stripPreloads(outDir);
      // Only the stale one is replaced: a rename over the current one, open
      // in a running app, would fail on Windows.
      expect(renameSync).toHaveBeenCalledTimes(1);
      expect(renameSync).toHaveBeenCalledWith(expect.any(String), stale);
    } finally {
      renameSync.mockRestore();
    }
    expect(fs.readFileSync(stale, 'utf8')).not.toBe('stale');
    // No temporary file left behind.
    expect(fs.readdirSync(outDir)).toHaveLength(PRELOADS.length);
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
});
