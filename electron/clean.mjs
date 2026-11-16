#!/usr/bin/env node
// `pnpm electron:clean`: removes what learnX's Electron dev runs leave on this
// Mac, and prints each thing it removed:
//
// - the dev app's data folder (build/electron/data), unless --keep-data;
// - the preferences of io.robertying.learnXElectron, and of
//   com.github.Electron, which runs of the stock Electron.app wrote;
// - folders and files under ~/Library named after either id (or starting
//   with it and a dot, like `.savedState`) or named learnX, in Application
//   Support, Caches, HTTPStorages, Saved Application State, Logs and WebKit;
// - LaunchServices' entries for this checkout's learnX.app and Electron.app;
// - keychain items for "learnX Safe Storage" or "Electron Safe Storage".
//
// It never touches the Mac Catalyst app's io.robertying.learnX (its
// container, preferences or anything else named exactly that). It leaves
// build/electron/learnX.app itself, which the next run reuses.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { devRunRegistrations, IDS, isDevRunName } from './devTraces.mjs';
import { APP_NAME } from './macDevApp.mjs';

const LIBRARY_FOLDERS = [
  'Application Support',
  'Caches',
  'HTTPStorages',
  'Saved Application State',
  'Logs',
  'WebKit',
];
const LSREGISTER =
  '/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister';
const KEYCHAIN_SERVICES = [`${APP_NAME} Safe Storage`, 'Electron Safe Storage'];

const main = () => {
  if (process.platform !== 'darwin') {
    console.log('Nothing to clean: dev runs leave traces only on a Mac.');
    return;
  }
  const root = path.join(import.meta.dirname, '..');
  const library = path.join(os.homedir(), 'Library');
  /** @type {string[]} */
  const removed = [];

  const dataDir = path.join(root, 'build', 'electron', 'data');
  // --keep-data: the E2E tests' teardown, which leaves the dev login.
  if (!process.argv.includes('--keep-data') && fs.existsSync(dataDir)) {
    fs.rmSync(dataDir, { recursive: true, force: true });
    removed.push(dataDir);
  }

  // Preferences: through cfprefsd first, so it doesn't write them back.
  for (const id of IDS) {
    const deleted =
      spawnSync('defaults', ['delete', id], { stdio: 'ignore' }).status === 0;
    if (deleted) {
      removed.push(`defaults domain ${id}`);
    }
  }
  for (const folder of ['Preferences', path.join('Preferences', 'ByHost')]) {
    const dir = path.join(library, folder);
    for (const name of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
      if (name.endsWith('.plist') && isDevRunName(name)) {
        fs.rmSync(path.join(dir, name), { force: true });
        removed.push(path.join(dir, name));
      }
    }
  }

  for (const folder of LIBRARY_FOLDERS) {
    const dir = path.join(library, folder);
    for (const name of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
      if (isDevRunName(name)) {
        fs.rmSync(path.join(dir, name), { recursive: true, force: true });
        removed.push(path.join(dir, name));
      }
    }
  }

  const dump = execFileSync(LSREGISTER, ['-dump'], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  for (const registered of devRunRegistrations(dump, root)) {
    spawnSync(LSREGISTER, ['-u', registered], { stdio: 'ignore' });
    removed.push(`LaunchServices entry ${registered}`);
  }

  for (const service of KEYCHAIN_SERVICES) {
    while (
      spawnSync('security', ['delete-generic-password', '-s', service], {
        stdio: 'ignore',
      }).status === 0
    ) {
      removed.push(`keychain item "${service}"`);
    }
  }

  console.log(
    removed.length
      ? `Removed:\n${removed.map(item => `  ${item}`).join('\n')}`
      : 'Nothing to remove.',
  );
};

main();
