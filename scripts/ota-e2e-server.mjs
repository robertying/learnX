#!/usr/bin/env node
// A minimal over-the-air update server for the E2E builds, which ask
// http://localhost:8199/manifest for updates of runtime version "e2e" and trust
// the certificate from scripts/ota-e2e-cert.sh (scripts/ota-config-ios.sh,
// android/app/build.gradle). It speaks the expo-updates protocol (v1) as the
// real server does: signed multipart manifests and directives, assets by URL.
//
//   node scripts/ota-e2e-server.mjs <ios|android> [--port 8199]
//
// It exports the app's JS once (`expo export`, as an E2E build bundles it,
// into build/ota-e2e/<platform>/) and serves it as one update. What it answers
// is switched over HTTP, so a Maestro flow can drive it:
//   GET /mode/update    the update (the default); each /mode/… answers with
//                       /status
//   GET /mode/rollback  roll back to the bundle built into the app
//   GET /mode/none      no update
//   GET /mode/badsig    the update, signed with a key the app doesn't trust
//   GET /status         the update's id, the mode and how many manifest
//                       requests and bundle downloads came in, as JSON
//   GET /wait?for=manifest|bundle&after=N
//                       answers (with /status) once there have been more than
//                       N of them and the app has had a few seconds to store
//                       what it got, or after a minute
import { execFileSync } from 'node:child_process';
import {
  createHash,
  createPrivateKey,
  generateKeyPairSync,
  sign,
} from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, normalize } from 'node:path';

export const RUNTIME_VERSION = 'e2e';
export const DEFAULT_PORT = 8199;
// How long /wait waits at most, and how long after the event it answers.
const WAIT_MS = 60_000;
const SETTLE_MS = 3_000;

const root = join(import.meta.dirname, '..');

const contentTypes = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.json': 'application/json',
};

const sha256 = data => createHash('sha256').update(data).digest('base64url');
const md5 = data => createHash('md5').update(data).digest('hex');

/** A UUID made from a hash, so the same bundle is always the same update. */
const uuidFrom = hex =>
  `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;

/**
 * The update `expo export` wrote to `dist` for `platform`: its manifest
 * (without URLs' host) and the files it names, by URL path.
 */
export const loadUpdate = (dist, platform, createdAt) => {
  const metadata = JSON.parse(
    readFileSync(join(dist, 'metadata.json'), 'utf8'),
  );
  const { bundle, assets } = metadata.fileMetadata[platform];
  const files = new Map();
  const asset = (path, ext, contentType) => {
    const data = readFileSync(join(dist, path));
    const urlPath = `/assets/${path}`;
    files.set(urlPath, { data, contentType });
    return {
      hash: sha256(data),
      key: md5(data),
      fileExtension: ext,
      contentType,
      url: urlPath,
    };
  };
  const launchAsset = asset(bundle, '.bundle', 'application/javascript');
  return {
    manifest: {
      id: uuidFrom(createHash('sha256').update(launchAsset.hash).digest('hex')),
      createdAt,
      runtimeVersion: RUNTIME_VERSION,
      launchAsset,
      assets: assets.map(({ path, ext }) =>
        asset(
          path,
          `.${ext}`,
          contentTypes[`.${ext}`] ?? 'application/octet-stream',
        ),
      ),
      metadata: {},
      extra: {},
    },
    files,
  };
};

/** The `expo-signature` header value for `body`. */
export const signature = (body, privateKey) =>
  `sig="${sign('sha256', Buffer.from(body), privateKey).toString('base64')}", keyid="main"`;

/** A multipart/mixed body with one signed JSON part and the extensions part. */
export const multipart = (name, json, privateKey) => {
  const boundary = `learnx-e2e-${md5(json)}`;
  const part = (partName, body, headers = '') =>
    `--${boundary}\r\ncontent-type: application/json; charset=utf-8\r\ncontent-disposition: form-data; name="${partName}"\r\n${headers}\r\n${body}\r\n`;
  const body =
    part(name, json, `expo-signature: ${signature(json, privateKey)}\r\n`) +
    part('extensions', JSON.stringify({ assetRequestHeaders: {} })) +
    `--${boundary}--\r\n`;
  return { boundary, body };
};

/**
 * What the server answers a manifest request with in `mode`: a status, its
 * headers and body. `update` holds the manifest with asset URLs on `origin`.
 */
export const respond = ({ mode, platform, headers, update, origin, keys }) => {
  const protocol = { 'expo-protocol-version': '1', 'expo-sfv-version': '0' };
  if (headers['expo-platform'] !== platform) {
    return { status: 400, headers: protocol, body: `Only ${platform}` };
  }
  if (headers['expo-runtime-version'] !== RUNTIME_VERSION) {
    return {
      status: 404,
      headers: protocol,
      body: 'No update for this runtime version',
    };
  }
  if (mode === 'none') {
    return { status: 204, headers: protocol, body: '' };
  }
  let name;
  let json;
  if (mode === 'rollback') {
    name = 'directive';
    json = JSON.stringify({
      type: 'rollBackToEmbedded',
      parameters: { commitTime: new Date().toISOString() },
    });
  } else {
    name = 'manifest';
    const withUrl = asset => ({ ...asset, url: `${origin}${asset.url}` });
    json = JSON.stringify({
      ...update.manifest,
      launchAsset: withUrl(update.manifest.launchAsset),
      assets: update.manifest.assets.map(withUrl),
    });
  }
  const { boundary, body } = multipart(
    name,
    json,
    mode === 'badsig' ? keys.untrusted : keys.trusted,
  );
  return {
    status: 200,
    headers: {
      ...protocol,
      'cache-control': 'private, max-age=0',
      'content-type': `multipart/mixed; boundary=${boundary}`,
    },
    body,
  };
};

const exportUpdate = (platform, dist) => {
  if (existsSync(join(dist, 'metadata.json'))) {
    return;
  }
  console.log(`Exporting the ${platform} bundle to ${dist}`);
  execFileSync(
    'npx',
    [
      'expo',
      'export',
      '--platform',
      platform,
      '--output-dir',
      dist,
      '--dump-sourcemap',
    ],
    // The same bundle an E2E build embeds (babel/inline-env.js).
    { cwd: root, stdio: 'inherit', env: { ...process.env, TEST_LOGIN: '1' } },
  );
};

const main = () => {
  const [platform, ...args] = process.argv.slice(2);
  if (platform !== 'ios' && platform !== 'android') {
    console.error(
      'usage: node scripts/ota-e2e-server.mjs <ios|android> [--port 8199]',
    );
    process.exit(1);
  }
  const portIndex = args.indexOf('--port');
  const port = portIndex >= 0 ? Number(args[portIndex + 1]) : DEFAULT_PORT;

  execFileSync(join(root, 'scripts/ota-e2e-cert.sh'), { stdio: 'inherit' });
  const dist = join(root, 'build/ota-e2e', platform);
  exportUpdate(platform, dist);
  const update = loadUpdate(dist, platform, new Date().toISOString());
  const keys = {
    trusted: createPrivateKey(
      readFileSync(join(root, 'build/ota-e2e/private-key.pem')),
    ),
    untrusted: generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey,
  };
  let mode = 'update';
  const counts = { manifest: 0, bundle: 0 };
  const waiters = new Set();
  const currentStatus = () => ({
    id: update.manifest.id,
    mode,
    manifestRequests: counts.manifest,
    bundleDownloads: counts.bundle,
  });
  const count = kind => {
    counts[kind] += 1;
    for (const waiter of waiters) waiter();
  };

  createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    const send = (status, headers, body) => {
      res.writeHead(status, headers);
      res.end(body);
    };
    if (url.pathname.startsWith('/mode/')) {
      mode = url.pathname.slice('/mode/'.length);
      console.log(`Mode: ${mode}`);
      return send(
        200,
        { 'content-type': 'application/json' },
        JSON.stringify(currentStatus()),
      );
    }
    const sendStatus = () =>
      send(
        200,
        { 'content-type': 'application/json' },
        JSON.stringify(currentStatus()),
      );
    if (url.pathname === '/status') {
      return sendStatus();
    }
    if (url.pathname === '/wait') {
      const kind =
        url.searchParams.get('for') === 'bundle' ? 'bundle' : 'manifest';
      const after = Number(url.searchParams.get('after') ?? 0);
      let done = false;
      const finish = settle => {
        if (done) return;
        done = true;
        waiters.delete(check);
        clearTimeout(timeout);
        setTimeout(sendStatus, settle);
      };
      const check = () => counts[kind] > after && finish(SETTLE_MS);
      const timeout = setTimeout(() => finish(0), WAIT_MS);
      waiters.add(check);
      return check();
    }
    if (url.pathname === '/manifest') {
      count('manifest');
      const answer = respond({
        mode,
        platform,
        headers: req.headers,
        update,
        origin: `http://${req.headers.host}`,
        keys,
      });
      console.log(
        `Manifest request ${counts.manifest} (${req.headers['expo-platform']}, ${req.headers['expo-runtime-version']}): ${answer.status} ${mode}`,
      );
      return send(answer.status, answer.headers, answer.body);
    }
    const file = update.files.get(normalize(url.pathname));
    if (file) {
      if (file === update.files.get(update.manifest.launchAsset.url)) {
        count('bundle');
      }
      return send(200, { 'content-type': file.contentType }, file.data);
    }
    send(404, {}, 'Not found');
  }).listen(port, () => {
    console.log(
      `Serving update ${update.manifest.id} for ${platform} at http://localhost:${port}/manifest`,
    );
  });
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
