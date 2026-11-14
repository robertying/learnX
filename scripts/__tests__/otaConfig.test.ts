// The over-the-air update settings: the URL and Expo project id in .env (not
// in the repo), the runtime version in app.json and the code-signing
// certificate in certs/ota-certificate.pem. scripts/ota-config-ios.sh writes
// them into Expo.plist and android/app/build.gradle into resources the
// manifest reads; the rest is in Expo.plist and the build.gradle. A mismatch
// shows up only as updates that never arrive, so keep them in step.
import { X509Certificate } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) =>
  readFileSync(join(__dirname, '../..', path), 'utf8');

const appJson = JSON.parse(read('app.json')) as {
  runtimeVersion: string;
  updates?: unknown;
};

const plist = read('ios/learnX/Expo.plist');
const plistDict = (dictKey: string) => {
  const body = new RegExp(
    `<key>${dictKey}</key>\\s*<dict>([\\s\\S]*?)</dict>`,
  ).exec(plist)?.[1];
  return Object.fromEntries(
    [
      ...(body ?? '').matchAll(
        /<key>([^<]*)<\/key>\s*<string>([^<]*)<\/string>/g,
      ),
    ].map(([, key, value]) => [key, value]),
  );
};

const manifest = read('android/app/src/main/AndroidManifest.xml');
const metaData = (name: string) =>
  new RegExp(
    `android:name="expo\\.modules\\.updates\\.${name}"\\s*android:value="([^"]*)"`,
  )
    .exec(manifest)?.[1]
    .replaceAll('&quot;', '"');

test('the runtime version is an app version', () => {
  expect(appJson.runtimeVersion).toMatch(/^\d+\.\d+\.\d+$/);
});

test('the update server stays out of the repo', () => {
  expect(appJson.updates).toBeUndefined();
  expect(read('.env.example')).toMatch(/^OTA_UPDATE_URL=$/m);
  expect(read('.env.example')).toMatch(/^EXPO_PROJECT_ID=$/m);
});

test('the certificate can sign code', () => {
  const certificate = new X509Certificate(read('certs/ota-certificate.pem'));
  expect(certificate.keyUsage).toContain('1.3.6.1.5.5.7.3.3');
});

test('the build writes the URL, runtime version, headers and certificate', () => {
  expect(plist).not.toMatch(
    /EXUpdatesURL|EXUpdatesRuntimeVersion|EXUpdatesCodeSigningCertificate/,
  );
  expect(metaData('ENABLED')).toBe('${otaEnabled}');
  expect(metaData('EXPO_UPDATE_URL')).toBe('@string/expo_updates_url');
  expect(metaData('EXPO_RUNTIME_VERSION')).toBe('@string/expo_runtime_version');
  expect(metaData('UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY')).toBe(
    '@string/expo_updates_request_headers',
  );
  expect(metaData('CODE_SIGNING_CERTIFICATE')).toBe(
    '@string/expo_updates_certificate',
  );
  for (const file of [
    'scripts/ota-config-ios.sh',
    'android/app/build.gradle',
  ]) {
    const text = read(file);
    expect(text).toContain('certs/ota-certificate.pem');
    expect(text).toContain('OTA_UPDATE_URL');
    expect(text).toContain('EXPO_PROJECT_ID');
  }
});

test('both platforms ask for the production channel and sign alike', () => {
  expect(plistDict('EXUpdatesRequestHeaders')).toEqual({
    'expo-channel-name': 'production',
  });
  expect(read('android/app/build.gradle')).toContain(
    '["expo-channel-name": "production"]',
  );
  expect(JSON.parse(metaData('CODE_SIGNING_METADATA')!)).toEqual(
    plistDict('EXUpdatesCodeSigningMetadata'),
  );
});
