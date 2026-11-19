import { spawnSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { signatureProblem } from '../../electron/updateSignature.ts';
import {
  signUpdateFiles,
  updateFileVersion,
  updateFiles,
} from '../release/sign-electron-update.mjs';

const keyPair = () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  return {
    privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }) as string,
    publicKey: publicKey.export({ type: 'spki', format: 'pem' }) as string,
  };
};

let dir: string;
const keys = keyPair();
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sign-electron-update-'));
  for (const name of [
    'latest.yml',
    'latest-linux.yml',
    'latest-linux-arm64.yml',
    'learnX-windows-v19.0.0.exe',
    'learnX-windows-v19.0.0.exe.blockmap',
  ]) {
    fs.writeFileSync(
      path.join(dir, name),
      name.endsWith('.yml') ? `version: 19.0.0\npath: ${name}\n` : `${name}\n`,
    );
  }
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const signatures = () =>
  fs.readdirSync(dir).filter(name => name.endsWith('.sig'));

it('finds the update files', () => {
  expect(updateFiles(dir)).toEqual([
    'latest-linux-arm64.yml',
    'latest-linux.yml',
    'latest.yml',
  ]);
});

it('writes a signature the app accepts next to each', () => {
  expect(
    signUpdateFiles(dir, keys.privateKey, keys.publicKey, '19.0.0'),
  ).toEqual([
    'latest-linux-arm64.yml.sig',
    'latest-linux.yml.sig',
    'latest.yml.sig',
  ]);
  for (const name of updateFiles(dir)) {
    expect(
      signatureProblem(
        fs.readFileSync(path.join(dir, name)),
        fs.readFileSync(path.join(dir, `${name}.sig`), 'utf8'),
        keys.publicKey,
      ),
    ).toBeNull();
  }
});

it('refuses a key that isn’t the committed public key’s pair, writing nothing', () => {
  expect(() =>
    signUpdateFiles(dir, keyPair().privateKey, keys.publicKey, '19.0.0'),
  ).toThrow('signature doesn’t match');
  expect(signatures()).toEqual([]);
});

it('refuses a placeholder public key', () => {
  const placeholder = `PLACEHOLDER: not learnX's update key.\n${keys.publicKey}`;
  expect(() =>
    signUpdateFiles(dir, keys.privateKey, placeholder, '19.0.0'),
  ).toThrow('is a placeholder');
  expect(signatures()).toEqual([]);
});

it('refuses a folder without update files', () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'sign-electron-update-'));
  try {
    expect(() =>
      signUpdateFiles(empty, keys.privateKey, keys.publicKey, '19.0.0'),
    ).toThrow('No latest*.yml');
  } finally {
    fs.rmSync(empty, { recursive: true });
  }
});

it('reads an update file’s version', () => {
  expect(updateFileVersion('version: 19.0.0\nfiles: []\n')).toBe('19.0.0');
  expect(updateFileVersion("path: x\nversion: '19.1.0'\n")).toBe('19.1.0');
  expect(updateFileVersion('path: x\n')).toBeNull();
});

it('refuses an update file for another version, writing nothing', () => {
  fs.writeFileSync(
    path.join(dir, 'latest-linux.yml'),
    'version: 18.9.0\npath: learnX-linux-x86_64-v18.9.0.AppImage\n',
  );
  expect(() =>
    signUpdateFiles(dir, keys.privateKey, keys.publicKey, '19.0.0'),
  ).toThrow(
    "latest-linux.yml is for version 18.9.0, not package.json's 19.0.0",
  );
  expect(signatures()).toEqual([]);
});

it('finds the committed public key when run as a script', () => {
  const keyFile = path.join(dir, 'key.pem');
  fs.writeFileSync(keyFile, keys.privateKey);
  const { status, stderr } = spawnSync(
    'node',
    [
      path.join(__dirname, '../release/sign-electron-update.mjs'),
      dir,
      '--key',
      keyFile,
    ],
    { encoding: 'utf8' },
  );
  // A throwaway key isn't the committed key's pair: reaching that check means
  // certs/electron-public-key.pem and package.json were found from the repo root.
  expect(status).toBe(1);
  expect(stderr).not.toContain('ENOENT');
  expect(stderr).toMatch(/signature doesn’t match|is a placeholder/);
  expect(signatures()).toEqual([]);
});
