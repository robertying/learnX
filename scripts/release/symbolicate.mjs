#!/usr/bin/env node
// Turns the JS frames of a Crashlytics report back into source files, lines
// and function names, with the source map of the bundle that crashed.
//
//   node scripts/release/symbolicate.mjs --platform ios|macos|android \
//     [--bundle <js_bundle>] [--version <x.y.z> --build <build>] \
//     [--map <file>] [<stack file>]
//
// (`bundle exec fastlane symbolicate` runs it.) Paste the report's stack into a
// file, or pipe it in. Which map decodes it:
// - `--bundle` is the report's `js_bundle` key: an over-the-air update's id
//   uses build/ota/updates/<id>/<ios|android>.map, kept when the update was
//   published (the Mac app runs the iOS bundle). `embedded`, or no key, is the
//   bundle built into the app.
// - The built-in bundle uses the map the release build kept,
//   build/release/v<version>/sourcemaps/learnX-<platform>-v<version>-<build>.map
//   (fastlane/Fastfile), for the report's version and build (Android's build is
//   its version code). Without it, the maps zip is taken from that version's
//   GitHub release (`gh`).
// - `--map` names the map directly.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const root = join(import.meta.dirname, '../..');
const PLATFORMS = ['ios', 'macos', 'android'];

/**
 * Where the map of a report's bundle is kept, relative to `base`.
 * @param {{ platform?: string, bundle?: string, version?: string, build?: string }} report
 * @param {string} [base]
 */
export const mapPath = ({ platform, bundle, version, build }, base = root) => {
  if (!platform || !PLATFORMS.includes(platform)) {
    throw new Error(`--platform must be one of ${PLATFORMS.join(', ')}`);
  }
  if (bundle && bundle !== 'embedded') {
    const otaPlatform = platform === 'android' ? 'android' : 'ios';
    return join(base, 'build/ota/updates', bundle, `${otaPlatform}.map`);
  }
  if (!version || !build) {
    throw new Error(
      "The built-in bundle needs the report's --version and --build (or --bundle <update id>, or --map)",
    );
  }
  const v = version.replace(/^v/, '');
  return join(
    base,
    `build/release/v${v}/sourcemaps/learnX-${platform}-v${v}-${build}.map`,
  );
};

/**
 * Takes a store build's map from its GitHub release (the maps zip
 * `fastlane github_release` attaches) when it isn't on this Mac.
 */
const downloadStoreMap = (map, version) => {
  const v = version.replace(/^v/, '');
  const dir = mkdtempSync(join(tmpdir(), 'learnx-maps-'));
  try {
    execFileSync(
      'gh',
      [
        'release',
        'download',
        `v${v}`,
        '--repo',
        'robertying/learnX',
        '--pattern',
        `learnX-sourcemaps-v${v}.zip`,
        '--dir',
        dir,
      ],
      { stdio: 'inherit' },
    );
    execFileSync('unzip', [
      '-o',
      '-q',
      join(dir, `learnX-sourcemaps-v${v}.zip`),
      '-d',
      join(map, '..'),
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

/** The stack with each `file:line:column` replaced by `source:line:name`. */
export const symbolicate = (map, stack) =>
  execFileSync(join(root, 'node_modules/.bin/metro-symbolicate'), [map], {
    input: stack,
    encoding: 'utf8',
  });

const main = () => {
  const { values, positionals } = parseArgs({
    options: {
      platform: { type: 'string' },
      bundle: { type: 'string' },
      version: { type: 'string' },
      build: { type: 'string' },
      map: { type: 'string' },
    },
    allowPositionals: true,
  });
  const map = values.map ?? mapPath(values);
  const storeBuild = !values.bundle || values.bundle === 'embedded';
  if (!existsSync(map) && !values.map && storeBuild) {
    downloadStoreMap(map, values.version ?? '');
  }
  if (!existsSync(map)) {
    throw new Error(`No source map at ${map}`);
  }
  const file = positionals[0];
  const stack = readFileSync(file && file !== '-' ? file : 0, 'utf8');
  process.stdout.write(symbolicate(map, stack));
};

if (process.argv[1] === import.meta.filename) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
