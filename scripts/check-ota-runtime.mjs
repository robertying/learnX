#!/usr/bin/env node
// Checks that the over-the-air runtime version (app.json) changes when native
// code does. ota-fingerprint.json records the native fingerprint of each
// platform (`npx expo-updates fingerprint:generate`, configured in
// fingerprint.config.js) at the current runtime version:
// - native code changed and that runtime version has shipped (a v<version>
//   tag exists): an update published for it would reach builds whose native
//   code can't run it. Set it to the app version of the release this goes in
//   (AGENTS.md, "Over-the-air updates").
// - native code changed before that version shipped: no build has it yet, so
//   only the record changes.
// - runtime version changed with no native change: older builds would stop
//   getting updates for nothing. Put it back.
// Record the new state with `node scripts/check-ota-runtime.mjs --write`.
// Fingerprints can differ between machines (files a build left behind), so
// CI's, from a clean checkout, are the ones to record: a failing check prints
// them.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const recordPath = join(root, 'ota-fingerprint.json');

const fingerprint = platform =>
  JSON.parse(
    execFileSync(
      'npx',
      ['expo-updates', 'fingerprint:generate', '--platform', platform],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ),
  ).hash;

/**
 * What to tell the developer, or null when the record matches. `released`:
 * whether the recorded runtime version has shipped.
 */
export const verdict = (recorded, current, released) => {
  const nativeChanged =
    recorded.ios !== current.ios || recorded.android !== current.android;
  const runtimeChanged = recorded.runtimeVersion !== current.runtimeVersion;
  if (!nativeChanged && !runtimeChanged) {
    return null;
  }
  const record = `Record it in ota-fingerprint.json:\n${JSON.stringify(current, null, 2)}`;
  if (nativeChanged && !runtimeChanged) {
    const platforms = ['ios', 'android'].filter(
      p => recorded[p] !== current[p],
    );
    if (!released) {
      return `Native code changed (${platforms.join(', ')}) before ${current.runtimeVersion} shipped, so the runtime version can stay. ${record}`;
    }
    return `Native code changed (${platforms.join(', ')}) but the over-the-air runtime version is still ${current.runtimeVersion}, which has shipped: set runtimeVersion in app.json to the app version of the release this goes in ("Over-the-air updates" in AGENTS.md). ${record}`;
  }
  if (runtimeChanged && !nativeChanged) {
    return `The over-the-air runtime version changed from ${recorded.runtimeVersion} to ${current.runtimeVersion} with no native change, so older builds would stop getting updates: put it back to ${recorded.runtimeVersion}.`;
  }
  return `Native code and the runtime version changed. ${record}`;
};

/** Whether `version` has a release tag on origin. */
const isReleased = version =>
  execFileSync(
    'git',
    ['ls-remote', '--tags', 'origin', `refs/tags/v${version}`],
    {
      cwd: root,
      encoding: 'utf8',
    },
  ).trim() !== '';

const main = () => {
  const { runtimeVersion } = JSON.parse(
    readFileSync(join(root, 'app.json'), 'utf8'),
  );
  const current = {
    runtimeVersion,
    ios: fingerprint('ios'),
    android: fingerprint('android'),
  };
  if (process.argv.includes('--write')) {
    writeFileSync(recordPath, `${JSON.stringify(current, null, 2)}\n`);
    console.log(`Wrote ${recordPath}`);
    return;
  }
  const recorded = JSON.parse(readFileSync(recordPath, 'utf8'));
  const message = verdict(
    recorded,
    current,
    isReleased(recorded.runtimeVersion),
  );
  if (message) {
    console.error(message);
    process.exit(1);
  }
  console.log(
    `Native code unchanged since runtime version ${runtimeVersion} (ios ${current.ios.slice(0, 8)}, android ${current.android.slice(0, 8)})`,
  );
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
