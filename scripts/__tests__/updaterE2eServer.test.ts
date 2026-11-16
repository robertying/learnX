// scripts/updater-e2e-server.mjs stands in for the TUNA mirror in E2E runs:
// `latest.json` as fastlane writes it, naming the one APK it serves under
// every ABI, with its SHA-256 (and a damaged APK, to test the check).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const server = join(__dirname, '../updater-e2e-server.mjs');

interface Answer {
  status: number;
  type: string;
  body: string;
  apk?: boolean;
}

/** What the server answers to a GET of `path` in `mode`, serving "apk". */
const answer = (path: string, mode: string): Answer =>
  JSON.parse(
    execFileSync(
      'node',
      [
        '--input-type=module',
        '-e',
        `
const { respond } = await import(${JSON.stringify(server)});
const answer = respond(${JSON.stringify(path)}, ${JSON.stringify(mode)}, Buffer.from('apk'));
process.stdout.write(JSON.stringify({ ...answer, body: answer.body.toString() }));
`,
      ],
      { encoding: 'utf8' },
    ),
  ) as Answer;

const sha256 = createHash('sha256').update('apk').digest('hex');

it('lists the APK under every ABI as a newer release', () => {
  const { status, body } = answer('/latest.json', 'update');
  expect(status).toBe(200);
  const latest = JSON.parse(body) as {
    version: string;
    files: { name: string; size: number; sha256: string }[];
  };
  expect(latest.version).toBe('99.0.0');
  expect(latest.files).toContainEqual({
    name: 'learnX-arm64-v8a-v99.0.0.apk',
    size: 3,
    sha256,
  });
  expect(latest.files.map(file => file.name)).toEqual([
    'learnX-arm64-v8a-v99.0.0.apk',
    'learnX-armeabi-v7a-v99.0.0.apk',
    'learnX-x86_64-v99.0.0.apk',
    'learnX-universal-v99.0.0.apk',
  ]);
});

it('serves a damaged APK in badsum mode, with the same latest.json', () => {
  expect(answer('/latest.json', 'badsum').body).toBe(
    answer('/latest.json', 'update').body,
  );
  const download = answer('/learnX-arm64-v8a-v99.0.0.apk', 'badsum');
  expect(download.apk).toBe(true);
  expect(download.body).toHaveLength(3);
  expect(download.body).not.toBe('apk');
});

it('has no release in none mode', () => {
  expect(answer('/latest.json', 'none').status).toBe(404);
});

it('serves the APK by any ABI name, and nothing else', () => {
  expect(answer('/learnX-x86_64-v99.0.0.apk', 'update')).toEqual({
    status: 200,
    type: 'application/vnd.android.package-archive',
    body: 'apk',
    apk: true,
  });
  expect(answer('/learnX-x86_64-v98.0.0.apk', 'update').status).toBe(404);
  expect(answer('/other', 'update').status).toBe(404);
});
