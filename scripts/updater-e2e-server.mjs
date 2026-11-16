#!/usr/bin/env node
// The APK mirror for the E2E builds, which look for updates at
// http://localhost:8198 instead of the TUNA mirror (helpers/update.ts). It
// serves one APK as a newer release: `latest.json` says version 99.0.0 and
// lists the APK under every ABI's name, and any learnX-<abi>-v99.0.0.apk is
// that APK. Android installs it over itself, which is all the updater needs
// (the APK must be signed with the installed app's key: an E2E build of the
// same checkout). What it answers is switched over HTTP, so a Maestro flow
// can drive it:
//   GET /mode/update   the release (the default); each /mode/… answers with
//                      /status
//   GET /mode/badsum   the release, with the APK damaged (its last byte
//                      changed), so it doesn't match latest.json's SHA-256.
//                      latest.json stays the same as in update mode, since
//                      the app keeps it for a day
//   GET /mode/none     no release (latest.json answers 404)
//   GET /status        the mode and how many APK downloads came in, as JSON
//
//   node scripts/updater-e2e-server.mjs <apk> [--port 8198]
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';

export const DEFAULT_PORT = 8198;
export const VERSION = '99.0.0';
const ABIS = ['arm64-v8a', 'armeabi-v7a', 'x86_64', 'universal'];

export const apkName = abi => `learnX-${abi}-v${VERSION}.apk`;

/** `latest.json` as fastlane writes it, for `apk` under every ABI's name. */
export const latestJson = apk => {
  const sha256 = createHash('sha256').update(apk).digest('hex');
  return {
    version: VERSION,
    files: ABIS.map(abi => ({ name: apkName(abi), size: apk.length, sha256 })),
  };
};

/** `apk` with its last byte changed: the same size, another SHA-256. */
const damaged = apk => {
  const copy = Buffer.from(apk);
  if (copy.length > 0) {
    copy[copy.length - 1] = 0xff - copy[copy.length - 1];
  }
  return copy;
};

/**
 * The answer to a GET of `path` in `mode`: `{ status, type, body }`, and
 * `apk: true` for a download of the APK.
 */
export const respond = (path, mode, apk) => {
  if (path === '/latest.json') {
    return mode === 'none'
      ? { status: 404, type: 'text/plain', body: 'no release' }
      : {
          status: 200,
          type: 'application/json',
          body: JSON.stringify(latestJson(apk)),
        };
  }
  if (ABIS.some(abi => path === `/${apkName(abi)}`)) {
    return {
      status: 200,
      type: 'application/vnd.android.package-archive',
      body: mode === 'badsum' ? damaged(apk) : apk,
      apk: true,
    };
  }
  return { status: 404, type: 'text/plain', body: 'not found' };
};

const main = () => {
  const [apkPath, ...args] = process.argv.slice(2);
  if (!apkPath) {
    console.error(
      'usage: node scripts/updater-e2e-server.mjs <apk> [--port 8198]',
    );
    process.exit(1);
  }
  const portIndex = args.indexOf('--port');
  const port = portIndex >= 0 ? Number(args[portIndex + 1]) : DEFAULT_PORT;
  const apk = readFileSync(apkPath);
  let mode = 'update';
  let downloads = 0;
  const status = () => JSON.stringify({ mode, apkDownloads: downloads });

  /** @type {import('node:http').RequestListener} */
  const handle = (req, res) => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    console.log(`${req.method} ${pathname}`);
    if (pathname.startsWith('/mode/')) {
      mode = pathname.slice('/mode/'.length);
      console.log(`Mode: ${mode}`);
    }
    if (pathname.startsWith('/mode/') || pathname === '/status') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(status());
      return;
    }
    const answer = respond(pathname, mode, apk);
    if (answer.apk) {
      downloads += 1;
    }
    res.writeHead(answer.status, {
      'content-type': answer.type,
      'content-length': Buffer.byteLength(answer.body),
    });
    res.end(answer.body);
  };

  // Loopback only, as scripts/ota-e2e-server.mjs: the device comes in through
  // `adb reverse`.
  createServer(handle)
    .on('error', (/** @type {NodeJS.ErrnoException} */ error) => {
      if (error.code !== 'EADDRNOTAVAIL' && error.code !== 'EAFNOSUPPORT') {
        throw error;
      }
    })
    .listen(port, '::1');
  createServer(handle).listen(port, '127.0.0.1', () => {
    console.log(`Serving ${apkPath} as ${VERSION} at http://localhost:${port}`);
  });
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
