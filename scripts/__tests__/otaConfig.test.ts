// The over-the-air update settings: app.json holds the URL and runtime version
// (`eoas publish` reads them too) and certs/ota-certificate.pem the
// code-signing certificate. scripts/ota-config-ios.sh writes them into
// Expo.plist and android/app/build.gradle into string resources the manifest
// reads; the rest is in Expo.plist and the manifest. A mismatch shows up only
// as updates that never arrive, so keep them in step.
import { X509Certificate } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) =>
  readFileSync(join(__dirname, '../..', path), 'utf8');

const appJson = JSON.parse(read('app.json')) as {
  runtimeVersion: string;
  updates: { url: string };
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

test('the runtime version is an app version no newer than this one', () => {
  const { version } = JSON.parse(read('package.json')) as { version: string };
  const parts = (v: string) => v.split('.').map(Number);
  expect(appJson.runtimeVersion).toMatch(/^\d+\.\d+\.\d+$/);
  const [a, b] = [parts(appJson.runtimeVersion), parts(version)];
  expect(a[0] - b[0] || a[1] - b[1] || a[2] - b[2]).toBeLessThanOrEqual(0);
});

test('the update URL is HTTPS', () => {
  expect(appJson.updates.url).toMatch(/^https:\/\/[^/]+\/manifest$/);
});

test('the certificate can sign code', () => {
  const certificate = new X509Certificate(read('certs/ota-certificate.pem'));
  expect(certificate.keyUsage).toContain('1.3.6.1.5.5.7.3.3');
});

test('the build writes the URL, runtime version and certificate', () => {
  expect(plist).not.toMatch(
    /EXUpdatesURL|EXUpdatesRuntimeVersion|EXUpdatesCodeSigningCertificate/,
  );
  expect(metaData('EXPO_UPDATE_URL')).toBe('@string/expo_updates_url');
  expect(metaData('EXPO_RUNTIME_VERSION')).toBe('@string/expo_runtime_version');
  expect(metaData('CODE_SIGNING_CERTIFICATE')).toBe(
    '@string/expo_updates_certificate',
  );
  expect(read('scripts/ota-config-ios.sh')).toContain(
    'certs/ota-certificate.pem',
  );
  expect(read('android/app/build.gradle')).toContain(
    'certs/ota-certificate.pem',
  );
});

test('both platforms send the same headers and signing metadata', () => {
  expect(
    JSON.parse(metaData('UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY')!),
  ).toEqual(plistDict('EXUpdatesRequestHeaders'));
  expect(plistDict('EXUpdatesRequestHeaders')['expo-channel-name']).toBe(
    'production',
  );
  expect(JSON.parse(metaData('CODE_SIGNING_METADATA')!)).toEqual(
    plistDict('EXUpdatesCodeSigningMetadata'),
  );
});
