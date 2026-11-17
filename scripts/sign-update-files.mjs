#!/usr/bin/env node
// Signs the Electron app's update files (latest.yml, latest-linux.yml,
// latest-linux-arm64.yml) in a folder before they're uploaded to the GitHub
// release: a detached `<file>.sig` next to each, which the app checks before
// it reads the file (electron/updateSignature.cjs). The key is the
// over-the-air updates' code-signing key, whose certificate is
// certs/ota-certificate.pem; its private key is never in the repo, so the
// signature is made by a command that has it:
//
//   node scripts/sign-update-files.mjs <dir> --command '<command>'
//   node scripts/sign-update-files.mjs <dir> --key <private key PEM>
//
// The command reads a file's bytes on stdin and writes the raw RSA SHA-256
// signature (PKCS#1 v1.5) on stdout, as `openssl dgst -sha256 -sign <key>`
// does: on the maintainer's Mac, that run over SSH on the host that keeps the
// key (the release skill). `--key` signs with a key file here, for test
// keys only. Each signature is then checked against the certificate
// (`--certificate`, certs/ota-certificate.pem by default), so a wrong key
// fails here and not on every user's update check.
import { execFileSync } from 'node:child_process';
import { createPrivateKey, sign } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import updateSignature from '../electron/updateSignature.cjs';

const { SIGNATURE_SUFFIX, formatSignature, signatureProblem } = updateSignature;

/** The update files electron-builder writes into a folder. */
export const updateFiles = (/** @type {string} */ dir) =>
  readdirSync(dir)
    .filter(name => /^latest(-[\w-]+)?\.yml$/.test(name))
    .sort();

/**
 * Signs every update file in `dir` with `signer` and checks each signature
 * against `certificate`; returns the signature files' names.
 *
 * @param {string} dir
 * @param {(data: Buffer) => Buffer} signer
 * @param {string | Buffer} certificate
 */
export const signUpdateFiles = (dir, signer, certificate) => {
  const files = updateFiles(dir);
  if (files.length === 0) {
    throw new Error(`No latest*.yml in ${dir}`);
  }
  return files.map(name => {
    const data = readFileSync(path.join(dir, name));
    const text = formatSignature(signer(data));
    const problem = signatureProblem(data, text, certificate);
    if (problem) {
      throw new Error(`${name}: ${problem} (not the certificate's key?)`);
    }
    writeFileSync(path.join(dir, name + SIGNATURE_SUFFIX), text);
    return name + SIGNATURE_SUFFIX;
  });
};

/** A signer with a private key file. */
export const keySigner = (/** @type {string} */ keyFile) => {
  const key = createPrivateKey(readFileSync(keyFile));
  return (/** @type {Buffer} */ data) => sign('sha256', data, key);
};

/** A signer running a shell command: the data on stdin, the signature out. */
export const commandSigner =
  (/** @type {string} */ command) => (/** @type {Buffer} */ data) =>
    execFileSync('/bin/sh', ['-c', command], {
      input: data,
      stdio: ['pipe', 'pipe', 'inherit'],
    });

const main = () => {
  const root = path.join(import.meta.dirname, '..');
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      command: { type: 'string' },
      key: { type: 'string' },
      certificate: {
        type: 'string',
        default: path.join(root, 'certs', 'ota-certificate.pem'),
      },
    },
  });
  const [dir] = positionals;
  if (!dir || !!values.command === !!values.key) {
    console.error(
      'Usage: sign-update-files.mjs <dir> (--command <command> | --key <private key PEM>) [--certificate <PEM>]',
    );
    process.exit(1);
  }
  const signer = values.command
    ? commandSigner(values.command)
    : keySigner(/** @type {string} */ (values.key));
  for (const name of signUpdateFiles(
    dir,
    signer,
    readFileSync(values.certificate),
  )) {
    console.log(`Signed ${path.join(dir, name)}`);
  }
};

// Run as a script (Jest's transform leaves `import.meta` out).
if (process.argv[1]?.endsWith(`${path.sep}sign-update-files.mjs`)) {
  main();
}
