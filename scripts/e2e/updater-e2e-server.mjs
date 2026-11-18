#!/usr/bin/env node
// The APK mirror for the E2E builds, which look for updates at
// http://localhost:8198 instead of the TUNA mirror (helpers/update.ts). It
// serves one APK as a newer release: `latest.json` says its version (99.0.0
// unless --version says otherwise) and lists the APK under every ABI's name,
// and any learnX-<abi>-v<version>.apk is that APK. scripts/e2e/e2e-updater.sh
// gives it an E2E build of that version (-Pe2eVersion), signed with the
// installed app's key. What it answers is switched over HTTP, so a Maestro
// flow can drive it:
//   GET /mode/update   the release (the default); each /mode/… answers with
//                      /status
//   GET /mode/slow     the release, with the APK sent over about 5 seconds,
//                      so a flow can leave the app while it downloads
//   GET /mode/badsum   the release, with the APK damaged (its last byte
//                      changed), so it doesn't match latest.json's SHA-256.
//                      latest.json stays the same as in update mode, since
//                      the app keeps it for a day
//   GET /mode/none     no release (latest.json answers 404)
//   GET /status        the mode, how many APK downloads came in and how
//                      many were sent in full, as JSON
//
//   node scripts/e2e/updater-e2e-server.mjs <apk> [--port 8198] [--version 99.0.0]
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';

export const DEFAULT_PORT = 8198;
export const DEFAULT_VERSION = '99.0.0';
const ABIS = ['arm64-v8a', 'armeabi-v7a', 'x86_64', 'universal'];
/** How long slow mode takes to send the APK, and in how many pieces. */
const SLOW_MS = 5000;
const SLOW_PIECES = 20;

export const apkName = (abi, version) => `learnX-${abi}-v${version}.apk`;

/**
 * `latest.json` as fastlane writes it, for `apk` as `version` under every
 * ABI's name.
 */
export const latestJson = (apk, version) => {
  const sha256 = createHash('sha256').update(apk).digest('hex');
  return {
    version,
    files: ABIS.map(abi => ({
      name: apkName(abi, version),
      size: apk.length,
      sha256,
    })),
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
 * The answer to a GET of `path` in `mode`, serving `apk` as `version`:
 * `{ status, type, body }`, `apk: true` for a download of the APK, and
 * `slow: true` for one to send slowly.
 * @returns {{ status: number, type: string, body: string | Buffer, apk?: boolean, slow?: boolean }}
 */
export const respond = (path, mode, apk, version = DEFAULT_VERSION) => {
  if (path === '/latest.json') {
    return mode === 'none'
      ? { status: 404, type: 'text/plain', body: 'no release' }
      : {
          status: 200,
          type: 'application/json',
          body: JSON.stringify(latestJson(apk, version)),
        };
  }
  if (ABIS.some(abi => path === `/${apkName(abi, version)}`)) {
    return {
      status: 200,
      type: 'application/vnd.android.package-archive',
      body: mode === 'badsum' ? damaged(apk) : apk,
      apk: true,
      ...(mode === 'slow' && { slow: true }),
    };
  }
  return { status: 404, type: 'text/plain', body: 'not found' };
};

const main = () => {
  const [apkPath, ...args] = process.argv.slice(2);
  if (!apkPath) {
    console.error(
      'usage: node scripts/e2e/updater-e2e-server.mjs <apk> [--port 8198] [--version 99.0.0]',
    );
    process.exit(1);
  }
  const option = (name, fallback) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : fallback;
  };
  const port = Number(option('--port', DEFAULT_PORT));
  const version = option('--version', DEFAULT_VERSION);
  const apk = readFileSync(apkPath);
  let mode = 'update';
  let downloads = 0;
  let sent = 0;
  const status = () =>
    JSON.stringify({ mode, apkDownloads: downloads, apkSent: sent });

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
    const answer = respond(pathname, mode, apk, version);
    if (answer.apk) {
      downloads += 1;
      res.on('finish', () => {
        sent += 1;
        console.log(`Sent ${pathname}`);
      });
    }
    res.writeHead(answer.status, {
      'content-type': answer.type,
      'content-length': Buffer.byteLength(answer.body),
    });
    if (!answer.slow) {
      res.end(answer.body);
      return;
    }
    const body = Buffer.from(answer.body);
    const size = Math.ceil(body.length / SLOW_PIECES);
    let offset = 0;
    const timer = setInterval(() => {
      const piece = body.subarray(offset, offset + size);
      offset += size;
      if (offset >= body.length) {
        clearInterval(timer);
        res.end(piece);
      } else {
        res.write(piece);
      }
    }, SLOW_MS / SLOW_PIECES);
    res.on('close', () => clearInterval(timer));
  };

  // Loopback only, as scripts/e2e/ota-e2e-server.mjs: the device comes in through
  // `adb reverse`.
  createServer(handle)
    .on('error', (/** @type {NodeJS.ErrnoException} */ error) => {
      if (error.code !== 'EADDRNOTAVAIL' && error.code !== 'EAFNOSUPPORT') {
        throw error;
      }
    })
    .listen(port, '::1');
  createServer(handle).listen(port, '127.0.0.1', () => {
    console.log(`Serving ${apkPath} as ${version} at http://localhost:${port}`);
  });
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
