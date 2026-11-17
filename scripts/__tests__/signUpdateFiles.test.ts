import { generateKeyPairSync } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import updateSignature from '../../electron/updateSignature.cjs';
import {
  commandSigner,
  keySigner,
  signUpdateFiles,
  updateFiles,
} from '../sign-update-files.mjs';

const { signatureProblem } = updateSignature;

let dir: string;
let keyFile: string;
let certificate: string;
let otherCertificate: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sign-update-files-'));
  const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
  keyFile = path.join(dir, 'key.pem');
  fs.writeFileSync(
    keyFile,
    pair.privateKey.export({ type: 'pkcs8', format: 'pem' }),
  );
  certificate = pair.publicKey.export({
    type: 'spki',
    format: 'pem',
  }) as string;
  otherCertificate = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  }).publicKey.export({ type: 'spki', format: 'pem' }) as string;
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

it('finds the update files', () => {
  expect(updateFiles(dir)).toEqual([
    'latest-linux-arm64.yml',
    'latest-linux.yml',
    'latest.yml',
  ]);
});

it('writes a signature the app accepts next to each', () => {
  expect(signUpdateFiles(dir, keySigner(keyFile), certificate)).toEqual([
    'latest-linux-arm64.yml.sig',
    'latest-linux.yml.sig',
    'latest.yml.sig',
  ]);
  for (const name of updateFiles(dir)) {
    expect(
      signatureProblem(
        fs.readFileSync(path.join(dir, name)),
        fs.readFileSync(path.join(dir, `${name}.sig`), 'utf8'),
        certificate,
      ),
    ).toBeNull();
  }
});

it('signs with a command, as openssl over SSH does', () => {
  signUpdateFiles(
    dir,
    commandSigner(`openssl dgst -sha256 -sign '${keyFile}'`),
    certificate,
  );
  expect(
    signatureProblem(
      fs.readFileSync(path.join(dir, 'latest.yml')),
      fs.readFileSync(path.join(dir, 'latest.yml.sig'), 'utf8'),
      certificate,
    ),
  ).toBeNull();
});

it('refuses a key that isn’t the certificate’s, writing nothing', () => {
  expect(() =>
    signUpdateFiles(dir, keySigner(keyFile), otherCertificate),
  ).toThrow('signature doesn’t match');
  expect(fs.readdirSync(dir).filter(name => name.endsWith('.sig'))).toEqual([]);
});

it('refuses a folder without update files', () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'sign-update-files-'));
  try {
    expect(() =>
      signUpdateFiles(empty, keySigner(keyFile), certificate),
    ).toThrow('No latest*.yml');
  } finally {
    fs.rmSync(empty, { recursive: true });
  }
});
