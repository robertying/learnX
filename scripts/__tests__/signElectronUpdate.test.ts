import { generateKeyPairSync } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import updateSignature from '../../electron/updateSignature.cjs';
import { signUpdateFiles, updateFiles } from '../sign-electron-update.mjs';

const { signatureProblem } = updateSignature;

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
    'learnX-Setup-19.0.0.exe',
    'learnX-Setup-19.0.0.exe.blockmap',
  ]) {
    fs.writeFileSync(path.join(dir, name), `${name}\n`);
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
  expect(signUpdateFiles(dir, keys.privateKey, keys.publicKey)).toEqual([
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
    signUpdateFiles(dir, keyPair().privateKey, keys.publicKey),
  ).toThrow('signature doesn’t match');
  expect(signatures()).toEqual([]);
});

it('refuses while the committed public key is the placeholder', () => {
  // As certs/electron-update.pem has it until the real key is committed.
  const placeholder = `PLACEHOLDER: not learnX's update key.\n${keys.publicKey}`;
  expect(() => signUpdateFiles(dir, keys.privateKey, placeholder)).toThrow(
    'still the placeholder',
  );
  expect(signatures()).toEqual([]);
});

it('refuses a folder without update files', () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'sign-electron-update-'));
  try {
    expect(() =>
      signUpdateFiles(empty, keys.privateKey, keys.publicKey),
    ).toThrow('No latest*.yml');
  } finally {
    fs.rmSync(empty, { recursive: true });
  }
});
