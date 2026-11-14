// The over-the-air update settings are written three times: app.json (read by
// `eoas publish`, which stamps each update with its runtime version),
// ios/learnX/Expo.plist and the Android manifest (built into the app). A
// mismatch shows up only as updates that never arrive, so keep them equal.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) =>
  readFileSync(join(__dirname, '../..', path), 'utf8');

const appJson = JSON.parse(read('app.json')) as {
  runtimeVersion: string;
  updates: { url: string };
};

const plist = read('ios/learnX/Expo.plist');
const plistString = (key: string) =>
  new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`).exec(plist)?.[1];
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
    .replaceAll('&quot;', '"')
    .replaceAll('&#10;', '\n');

test('the runtime version is the same everywhere', () => {
  expect(appJson.runtimeVersion).toMatch(/^\d+\.\d+\.\d+$/);
  expect(plistString('EXUpdatesRuntimeVersion')).toBe(appJson.runtimeVersion);
  expect(metaData('EXPO_RUNTIME_VERSION')).toBe(appJson.runtimeVersion);
});

test('the runtime version is no newer than the app version', () => {
  const { version } = JSON.parse(read('package.json')) as { version: string };
  const parts = (v: string) => v.split('.').map(Number);
  const [a, b] = [parts(appJson.runtimeVersion), parts(version)];
  const cmp = a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  expect(cmp).toBeLessThanOrEqual(0);
});

test('the update URL is the same everywhere', () => {
  expect(plistString('EXUpdatesURL')).toBe(appJson.updates.url);
  expect(metaData('EXPO_UPDATE_URL')).toBe(appJson.updates.url);
});

test('both platforms send the same headers and trust the same certificate', () => {
  expect(
    JSON.parse(metaData('UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY')!),
  ).toEqual(plistDict('EXUpdatesRequestHeaders'));
  expect(plistDict('EXUpdatesRequestHeaders')['expo-channel-name']).toBe(
    'production',
  );
  expect(JSON.parse(metaData('CODE_SIGNING_METADATA')!)).toEqual(
    plistDict('EXUpdatesCodeSigningMetadata'),
  );
  const certificate = plistString('EXUpdatesCodeSigningCertificate');
  expect(certificate).toMatch(
    /^-----BEGIN CERTIFICATE-----\n[\s\S]+\n-----END CERTIFICATE-----\n?$/,
  );
  expect(metaData('CODE_SIGNING_CERTIFICATE')?.trim()).toBe(
    certificate?.trim(),
  );
});
