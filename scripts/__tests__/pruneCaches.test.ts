// scripts/prune-caches.sh groups the repo's Actions caches by key without
// its trailing hash, commit or timestamp and keeps the newest of each group,
// so a key it groups wrong would delete a cache still in use. `gh` is a
// stand-in that lists the caches below (newest first) and logs deletions.
import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const script = join(__dirname, '../prune-caches.sh');
const sha = (n: number) => `${n}`.repeat(40).slice(0, 40);
const hash = (n: number) => `${n}`.repeat(64).slice(0, 64);

let dir: string;

/** The keys the script deletes from `keys`, listed newest first. */
const pruned = (keys: string[]) => {
  writeFileSync(
    join(dir, 'caches.tsv'),
    keys.map((key, i) => `${i + 1}\t${1048576}\t${key}\n`).join(''),
  );
  writeFileSync(
    join(dir, 'gh'),
    `#!/bin/bash
case "$*" in
  *"cache list"*last_accessed_at*) cat "${dir}/caches.tsv" ;;
  *"cache delete"*) echo "\${@: -1}" >> "${dir}/deleted" ;;
esac
`,
  );
  chmodSync(join(dir, 'gh'), 0o755);
  writeFileSync(join(dir, 'deleted'), '');
  execFileSync('bash', [script], {
    env: {
      ...process.env,
      PATH: `${dir}:${process.env.PATH}`,
      GITHUB_REPOSITORY: 'owner/repo',
    },
    stdio: 'ignore',
  });
  return readFileSync(join(dir, 'deleted'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(id => keys[Number(id) - 1]);
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'prune-caches-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

test('keeps the 2 newest of each hashed key', () => {
  expect(
    pruned([
      `jest-Linux-${hash(1)}`,
      `pods-macOS-${hash(1)}`,
      `jest-Linux-${hash(2)}`,
      `jest-Linux-${hash(3)}`,
      `pods-macOS-${hash(2)}`,
    ]),
  ).toEqual([`jest-Linux-${hash(3)}`]);
});

test('keeps only the newest Xcode compilation cache of each platform', () => {
  expect(
    pruned([
      `xcode-cas-iOS-${sha(1)}`,
      `xcode-cas-Mac-${sha(1)}`,
      `xcode-cas-iOS-${sha(2)}`,
    ]),
  ).toEqual([`xcode-cas-iOS-${sha(2)}`]);
});

test('groups timestamped keys (ccache) by their prefix', () => {
  expect(
    pruned([
      'ccache-android-2026-11-14T10:00:00.000Z',
      'ccache-android-2026-11-13T10:00:00.000Z',
      'ccache-android-2026-11-12T10:00:00.000Z',
    ]),
  ).toEqual(['ccache-android-2026-11-12T10:00:00.000Z']);
});

test("doesn't take a short hex word for a hash", () => {
  // `-cafe` is 4 hex characters, not a hash: two different groups.
  expect(
    pruned([
      'gradle-home-cafe',
      'gradle-home-beef',
      'gradle-home-cafe',
      'gradle-home-cafe',
    ]),
  ).toEqual(['gradle-home-cafe']);
});
