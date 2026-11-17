#!/usr/bin/env node
// A local stand-in for learnX's GitHub releases, to try the Electron app's
// updates (updater.cjs) without publishing anything. It serves the paths
// electron-updater's GitHub provider reads, for github.com/robertying/learnX
// on a test host:
//
//   GET /robertying/learnX/releases.atom
//       the release feed, one entry per folder in <dir> (named as its tag,
//       v19.0.1), newest first
//   GET /api/v3/repos/robertying/learnX/releases/latest
//   GET /robertying/learnX/releases/latest
//       the latest release's tag, as JSON (the newest folder): the first is
//       what the provider asks a host other than github.com
//   GET /robertying/learnX/releases/download/<tag>/<file>
//       a file in that folder (byte ranges too, for differential downloads)
//
//   node electron/updateServer.mjs <dir> [--port 8299]
//
// Point an app at it with `pnpm electron:package --update-host
// localhost:8299` (a test build), or a dev run with LEARNX_UPDATE_HOST set to
// the same. "Publish" a release by copying a build's installer, its
// latest*.yml and .blockmap into a new folder named v<version>.
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { parseArgs } from 'node:util';

export const DEFAULT_PORT = 8299;
const REPO = '/robertying/learnX/';

/** The release folders in `dir`, newest first (by modification time). */
const releases = (/** @type {string} */ dir) =>
  readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .map(entry => ({
      tag: entry.name,
      time: statSync(path.join(dir, entry.name)).mtime,
    }))
    .sort((a, b) => b.time.getTime() - a.time.getTime());

/** The release feed GitHub serves (the parts electron-updater reads). */
export const releaseFeed = (/** @type {string} */ dir) =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    ...releases(dir).map(
      ({ tag, time }) =>
        `<entry><id>tag:github.com,2008:Repository/release/${tag}</id>` +
        `<updated>${time.toISOString()}</updated>` +
        `<link rel="alternate" type="text/html" href="https://github.com${REPO}releases/tag/${tag}"/>` +
        `<title>${tag}</title></entry>`,
    ),
    '</feed>',
  ].join('\n');

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

/** A server for the releases in `dir`. */
export const createUpdateServer = (
  /** @type {string} */ dir,
  /** @type {(line: string) => void} */ log = () => {},
) =>
  createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    log(
      `${req.method} ${url.pathname}${req.headers.range ? ` ${req.headers.range}` : ''}`,
    );
    if (
      url.pathname === `${REPO}releases/latest` ||
      url.pathname === `/api/v3/repos${REPO}releases/latest`
    ) {
      const latest = releases(dir)[0];
      if (!latest) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ tag_name: latest.tag }));
      return;
    }
    if (url.pathname === `${REPO}releases.atom`) {
      res.writeHead(200, { 'content-type': 'application/atom+xml' });
      res.end(releaseFeed(dir));
      return;
    }
    const download = url.pathname.startsWith(`${REPO}releases/download/`)
      ? url.pathname
          .slice(`${REPO}releases/download/`.length)
          .split('/')
          .map(decodeURIComponent)
      : [];
    const file =
      download.length === 2 &&
      download.every(
        part => part && part !== '.' && part !== '..' && !/[\\/]/.test(part),
      )
        ? path.join(dir, ...download)
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
      console.log(
        `Serving ${path.resolve(dir)} as http://localhost:${port}${REPO.slice(0, -1)}`,
      ),
  );
}
