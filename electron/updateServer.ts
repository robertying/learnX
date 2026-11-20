#!/usr/bin/env node
// A local stand-in for the TUNA mirror's LatestRelease/ folder, to try the
// Electron app's updates (updater.ts) without publishing anything, as
// scripts/e2e/updater-e2e-server.mjs does for the Android APKs. It serves the
// files in <dir> as they are, byte ranges too, several at once as the
// mirror's nginx does (differential downloads read the .blockmap files, then
// the parts of the installer that changed):
//
//   GET /<file>    latest.yml, latest-linux.yml, their .sig, an installer, a
//                  .blockmap
//
//   node electron/updateServer.ts <dir> [--port 8299]
//
// Point an app at it with `pnpm electron:package --update-url
// http://localhost:8299/` (a test build), or a dev run with LEARNX_UPDATE_URL
// set to the same. "Release" a version by copying its build's installer,
// latest*.yml and .blockmap into <dir>, as the mirror copies them from the
// GitHub release, with each latest*.yml's signature by the key the app
// trusts (updateSignature.ts): without it, the app takes no update.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { parseArgs } from 'node:util';

export const DEFAULT_PORT = 8299;

type Range = { start: number; end: number };

/** One range of a Range header (`0-9`, `5-`, `-10`), or null if invalid. */
const parseRange = (spec: string, size: number): Range | null => {
  const match = /^(\d*)-(\d*)$/.exec(spec.trim());
  if (!match || (!match[1] && !match[2])) {
    return null;
  }
  const start = match[1] ? Number(match[1]) : size - Number(match[2]);
  const end = match[1] && match[2] ? Number(match[2]) : size - 1;
  return start < 0 || start > end || end >= size ? null : { start, end };
};

/**
 * The byte ranges of a file of `size` bytes a Range header asks for, or null
 * for the whole file; 'invalid' when they can't be served. Several ranges at
 * once are how electron-updater's differential downloads read the parts of
 * an installer that changed.
 */
export const byteRanges = (
  header: string | undefined,
  size: number,
): Range[] | null | 'invalid' => {
  if (!header) {
    return null;
  }
  const match = /^bytes=(.+)$/.exec(header);
  if (!match) {
    return 'invalid';
  }
  const ranges = match[1].split(',').map(spec => parseRange(spec, size));
  return ranges.every(range => range !== null)
    ? (ranges as Range[])
    : 'invalid';
};

/** The boundary between the parts of a multipart/byteranges response. */
const BOUNDARY = 'learnx-update-server';

/** A server for the files in `dir`. */
export const createUpdateServer = (
  dir: string,
  log: (line: string) => void = () => {},
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
    const ranges = byteRanges(req.headers.range, size);
    if (ranges === 'invalid') {
      res.writeHead(416, { 'content-range': `bytes */${size}` }).end();
      return;
    }
    if (ranges && ranges.length > 1) {
      // As nginx, which the mirror runs, answers several ranges: each part
      // with its own Content-Range.
      const heads = ranges.map(
        ({ start, end }) =>
          `--${BOUNDARY}\r\ncontent-type: application/octet-stream\r\ncontent-range: bytes ${start}-${end}/${size}\r\n\r\n`,
      );
      const tail = `--${BOUNDARY}--\r\n`;
      res.writeHead(206, {
        'content-type': `multipart/byteranges; boundary=${BOUNDARY}`,
        'content-length':
          ranges.reduce(
            (total, { start, end }, index) =>
              total + Buffer.byteLength(heads[index]) + end - start + 1 + 2,
            0,
          ) + Buffer.byteLength(tail),
        'accept-ranges': 'bytes',
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      const writePart = (index: number) => {
        if (index === ranges.length) {
          res.end(tail);
          return;
        }
        res.write(heads[index]);
        const part = createReadStream(file, ranges[index]);
        part.pipe(res, { end: false });
        part.on('end', () => {
          res.write('\r\n');
          writePart(index + 1);
        });
      };
      writePart(0);
      return;
    }
    const { start, end } = ranges?.[0] ?? { start: 0, end: size - 1 };
    res.writeHead(ranges ? 206 : 200, {
      'content-type': 'application/octet-stream',
      'content-length': end - start + 1,
      'accept-ranges': 'bytes',
      ...(ranges ? { 'content-range': `bytes ${start}-${end}/${size}` } : {}),
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    createReadStream(file, { start, end }).pipe(res);
  });

if (import.meta.main) {
  const { values, positionals } = parseArgs({
    options: { port: { type: 'string', default: String(DEFAULT_PORT) } },
    allowPositionals: true,
  });
  const dir = positionals[0];
  if (!dir || !existsSync(dir)) {
    console.error('Usage: node electron/updateServer.ts <dir> [--port 8299]');

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
