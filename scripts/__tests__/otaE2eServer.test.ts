// scripts/ota-e2e-server.mjs answers the E2E builds as the real update server
// would. These checks run its module in Node (ESM) on a made-up export and
// read the answers the way expo-updates does: the signed part must verify
// with the key the app trusts, and only with that one.
import { execFileSync } from 'node:child_process';
import { generateKeyPairSync, verify } from 'node:crypto';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const server = join(__dirname, '../ota-e2e-server.mjs');

const dist = mkdtempSync(join(tmpdir(), 'ota-e2e-'));
mkdirSync(join(dist, '_expo/static/js/ios'), { recursive: true });
mkdirSync(join(dist, 'assets'));
writeFileSync(join(dist, '_expo/static/js/ios/index-abc.hbc'), 'bundle');
writeFileSync(join(dist, 'assets/0123'), 'image');
writeFileSync(
  join(dist, 'metadata.json'),
  JSON.stringify({
    version: 0,
    bundler: 'metro',
    fileMetadata: {
      ios: {
        bundle: '_expo/static/js/ios/index-abc.hbc',
        assets: [{ path: 'assets/0123', ext: 'png' }],
      },
    },
  }),
);

const trusted = generateKeyPairSync('rsa', { modulusLength: 2048 });
const untrusted = generateKeyPairSync('rsa', { modulusLength: 2048 });

interface Answer {
  status: number;
  headers: Record<string, string>;
  body: string;
}

/** What the server answers in `mode` to a request with `headers`. */
const answer = (mode: string, headers: Record<string, string>): Answer =>
  JSON.parse(
    execFileSync(
      'node',
      [
        '--input-type=module',
        '-e',
        `
const { loadUpdate, respond } = await import(${JSON.stringify(server)});
const { createPrivateKey } = await import('node:crypto');
const keys = {
  trusted: createPrivateKey(${JSON.stringify(trusted.privateKey.export({ type: 'pkcs8', format: 'pem' }))}),
  untrusted: createPrivateKey(${JSON.stringify(untrusted.privateKey.export({ type: 'pkcs8', format: 'pem' }))}),
};
const update = loadUpdate(${JSON.stringify(dist)}, 'ios', '2026-11-14T00:00:00.000Z');
process.stdout.write(JSON.stringify(respond({
  mode: ${JSON.stringify(mode)},
  platform: 'ios',
  headers: ${JSON.stringify(headers)},
  update,
  origin: 'http://localhost:8199',
  keys,
})));
`,
      ],
      { encoding: 'utf8' },
    ),
  );

const request = {
  'expo-platform': 'ios',
  'expo-runtime-version': 'e2e',
  'expo-protocol-version': '1',
};

/** The parts of a multipart answer: their headers and body. */
const parts = ({ headers, body }: Answer) => {
  const boundary = headers['content-type'].split('boundary=')[1];
  return body
    .split(`--${boundary}`)
    .slice(1, -1)
    .map(part => {
      const [head, ...rest] = part.trim().split('\r\n\r\n');
      return {
        name: /name="([^"]+)"/.exec(head)![1],
        signature: /expo-signature: sig="([^"]+)", keyid="main"/.exec(
          head,
        )?.[1],
        body: rest.join('\r\n\r\n'),
      };
    });
};

const verifies = (
  part: { body: string; signature?: string },
  key: typeof trusted.publicKey,
) =>
  verify(
    'sha256',
    Buffer.from(part.body),
    key,
    Buffer.from(part.signature!, 'base64'),
  );

test('serves the export as a signed update', () => {
  const response = answer('update', request);
  expect(response.status).toBe(200);
  expect(response.headers['expo-protocol-version']).toBe('1');
  const [manifest, extensions] = parts(response);
  expect(manifest.name).toBe('manifest');
  expect(extensions.name).toBe('extensions');
  expect(verifies(manifest, trusted.publicKey)).toBe(true);
  expect(verifies(manifest, untrusted.publicKey)).toBe(false);

  const json = JSON.parse(manifest.body);
  expect(json).toMatchObject({
    runtimeVersion: 'e2e',
    createdAt: '2026-11-14T00:00:00.000Z',
    launchAsset: {
      url: 'http://localhost:8199/assets/_expo/static/js/ios/index-abc.hbc',
      contentType: 'application/javascript',
      fileExtension: '.bundle',
    },
    assets: [
      {
        url: 'http://localhost:8199/assets/assets/0123',
        contentType: 'image/png',
        fileExtension: '.png',
      },
    ],
  });
  expect(json.id).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  // The same export is always the same update.
  expect(JSON.parse(parts(answer('update', request))[0].body).id).toBe(json.id);
});

test('signs with an untrusted key in badsig mode', () => {
  const [manifest] = parts(answer('badsig', request));
  expect(verifies(manifest, trusted.publicKey)).toBe(false);
  expect(verifies(manifest, untrusted.publicKey)).toBe(true);
});

test('rolls back to the embedded bundle with a signed directive', () => {
  const [directive] = parts(answer('rollback', request));
  expect(directive.name).toBe('directive');
  expect(verifies(directive, trusted.publicKey)).toBe(true);
  expect(JSON.parse(directive.body).type).toBe('rollBackToEmbedded');
});

test('has no update for other runtime versions or platforms, or in none mode', () => {
  expect(answer('none', request).status).toBe(204);
  expect(
    answer('update', { ...request, 'expo-runtime-version': '19.0.0' }).status,
  ).toBe(404);
  expect(
    answer('update', { ...request, 'expo-platform': 'android' }).status,
  ).toBe(400);
});
