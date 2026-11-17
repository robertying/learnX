#!/usr/bin/env node
// Signs the Electron app's update files (latest.yml, latest-linux.yml,
// latest-linux-arm64.yml) in a folder before they're uploaded to the GitHub
// release: a detached Ed25519 signature, `<file>.sig`, next to each, which
// the app checks before it reads the file (electron/updateSignature.cjs)
// against the public key it carries, certs/electron-update.pem.
//
//   node scripts/sign-electron-update.mjs <dir> [--key <private key PEM>]
//
// The private key is never in the repo: --key, or the file
// LEARNX_UPDATE_SIGNING_KEY names (Rui keeps it in 1Password; a process
// substitution such as `--key <(op read …)` keeps it off the disk). Each
// signature is checked against the committed public key, so a wrong key
// fails here and not on every user's update check, and a placeholder key is
// refused.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import updateSignature from '../electron/updateSignature.cjs';

const { SIGNATURE_SUFFIX, isPlaceholderKey, signUpdateFile, signatureProblem } =
  updateSignature;

/** The update files electron-builder writes into a folder. */
export const updateFiles = (/** @type {string} */ dir) =>
  readdirSync(dir)
    .filter(name => /^latest(-[\w-]+)?\.yml$/.test(name))
    .sort();

/**
 * Signs every update file in `dir` with `privateKey` and checks each
 * signature against `publicKey`; returns the signature files' names.
 *
 * @param {string} dir
 * @param {string | Buffer} privateKey PEM
 * @param {string | Buffer} publicKey PEM
 */
export const signUpdateFiles = (dir, privateKey, publicKey) => {
  if (isPlaceholderKey(publicKey)) {
    throw new Error(
      'certs/electron-update.pem is a placeholder, not the update key: commit its real public key (electron/AGENTS.md)',
    );
  }
  const files = updateFiles(dir);
  if (files.length === 0) {
    throw new Error(`No latest*.yml in ${dir}`);
  }
  const signed = files.map(name => {
    const data = readFileSync(path.join(dir, name));
    const text = signUpdateFile(data, privateKey);
    const problem = signatureProblem(data, text, publicKey);
    if (problem) {
      throw new Error(`${name}: ${problem} (not the committed key's pair?)`);
    }
    return { name: name + SIGNATURE_SUFFIX, text };
  });
  for (const { name, text } of signed) {
    writeFileSync(path.join(dir, name), text);
  }
  return signed.map(({ name }) => name);
};

const main = () => {
  const root = path.join(import.meta.dirname, '..');
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { key: { type: 'string' } },
  });
  const [dir] = positionals;
  const keyFile = values.key ?? process.env.LEARNX_UPDATE_SIGNING_KEY;
  if (!dir || !keyFile) {
    console.error(
      'Usage: sign-electron-update.mjs <dir> --key <private key PEM> (or LEARNX_UPDATE_SIGNING_KEY)',
    );
    process.exit(1);
  }
  try {
    for (const name of signUpdateFiles(
      dir,
      readFileSync(keyFile),
      readFileSync(path.join(root, 'certs', 'electron-update.pem')),
    )) {
      console.log(`Signed ${path.join(dir, name)}`);
    }
  } catch (error) {
    console.error(/** @type {Error} */ (error).message);
    process.exit(1);
  }
};

// Run as a script (Jest's transform leaves `import.meta` out).
if (process.argv[1]?.endsWith(`${path.sep}sign-electron-update.mjs`)) {
  main();
}
