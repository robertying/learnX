#!/usr/bin/env node
// A local stand-in for the TUNA mirror's LatestRelease/ folder, to try the
// Electron app's updates (updater.cjs) without publishing anything, as
// scripts/updater-e2e-server.mjs does for the Android APKs. It serves the
// files in <dir> as they are, byte ranges too (differential downloads read
// the .blockmap files):
//
//   GET /<file>    latest.yml, latest-linux.yml, an installer, a .blockmap
//
//   node electron/updateServer.mjs <dir> [--port 8299]
//
// Point an app at it with `pnpm electron:package --update-url
// http://localhost:8299/` (a test build), or a dev run with LEARNX_UPDATE_URL
// set to the same. "Release" a version by copying its build's installer,
// latest*.yml and .blockmap into <dir>, as the mirror copies them from the
// GitHub release.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { parseArgs } from 'node:util';

export const DEFAULT_PORT = 8299;

/**
 * A byte range of a file of `size` bytes from a Range header, or null for
 * the whole file; 'invalid' when it can't be served.
 *
 * @returns {{ start: number; end: number } | null | 'invalid'}
 */
export const byteRange = (
  /** @type {string | undefined} */ header,
  /** @type {number} */ size,
) => {
  if (!header) {
    return null;
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) {
    return 'invalid';
  }
  const start = match[1] ? Number(match[1]) : size - Number(match[2]);
  const end = match[1] && match[2] ? Number(match[2]) : size - 1;
  return start < 0 || start > end || end >= size
    ? 'invalid'
    : { start, end: Math.min(end, size - 1) };
};

/** A server for the files in `dir`. */
export const createUpdateServer = (
  /** @type {string} */ dir,
  /** @type {(line: string) => void} */ log = () => {},
) =>
  createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    log(
      `${req.method} ${url.pathname}${req.headers.range ? ` ${req.headers.range}` : ''}`,
    );
    const name = decodeURIComponent(url.pathname.slice(1));
    const file =
      name && name !== '.' && name !== '..' && !/[\\/]/.test(name)
        ? path.join(dir, name)
        : null;
    if (!file || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404).end();
      return;
    }
    const { size } = statSync(file);
    const range = byteRange(req.headers.range, size);
    if (range === 'invalid') {
      res.writeHead(416, { 'content-range': `bytes */${size}` }).end();
      return;
    }
    const { start, end } = range ?? { start: 0, end: size - 1 };
    res.writeHead(range ? 206 : 200, {
      'content-type': 'application/octet-stream',
      'content-length': end - start + 1,
      'accept-ranges': 'bytes',
      ...(range ? { 'content-range': `bytes ${start}-${end}/${size}` } : {}),
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    createReadStream(file, { start, end }).pipe(res);
  });

// Run as a script (Jest's transform leaves `import.meta` out).
if (process.argv[1]?.endsWith(`${path.sep}updateServer.mjs`)) {
  const { values, positionals } = parseArgs({
    options: { port: { type: 'string', default: String(DEFAULT_PORT) } },
    allowPositionals: true,
  });
  const dir = positionals[0];
  if (!dir || !existsSync(dir)) {
    console.error('Usage: node electron/updateServer.mjs <dir> [--port 8299]');
    process.exit(1);
  }
  const port = Number(values.port);
  createUpdateServer(path.resolve(dir), line => console.log(line)).listen(
    port,
    '127.0.0.1',
    () =>
      console.log(`Serving ${path.resolve(dir)} as http://localhost:${port}/`),
  );
}
