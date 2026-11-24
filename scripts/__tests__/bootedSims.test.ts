// scripts/e2e/lib/booted-sims.mjs reads `xcrun simctl list -j devices runtimes`
// for scripts/e2e/e2e.sh, which gives the flows the simulator's iOS version
// and whether it's an iPad. The text listing it replaced broke when Xcode 27
// headed it with "== Devices ==".
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const script = join(__dirname, '../e2e/lib/booted-sims.mjs');

const sim = (name: string, udid: string, type: string, state: string) => ({
  lastBootedAt: '2026-11-19T08:00:00Z',
  dataPath: `/Users/me/Library/Developer/CoreSimulator/Devices/${udid}/data`,
  logPath: `/Users/me/Library/Logs/CoreSimulator/${udid}`,
  udid,
  isAvailable: true,
  deviceTypeIdentifier: `com.apple.CoreSimulator.SimDeviceType.${type}`,
  state,
  name,
});

// The shape simctl prints, with iOS 27.2 and 17.5 runtimes side by side.
const listing = {
  devices: {
    'com.apple.CoreSimulator.SimRuntime.iOS-27-2': [
      sim(
        'learnX iPhone 18 Pro',
        '11111111-1111-1111-1111-111111111111',
        'iPhone-18-Pro',
        'Booted',
      ),
      sim(
        'learnX iPad Pro 11',
        '22222222-2222-2222-2222-222222222222',
        'iPad-Pro-11-inch-M5-12GB',
        'Booted',
      ),
      sim(
        'learnX iPad Pro 13',
        '33333333-3333-3333-3333-333333333333',
        'iPad-Pro-13-inch-M5-12GB',
        'Shutdown',
      ),
    ],
    'com.apple.CoreSimulator.SimRuntime.iOS-17-5': [
      sim(
        'learnX iPhone 15',
        '44444444-4444-4444-4444-444444444444',
        'iPhone-15',
        'Booted',
      ),
    ],
    'com.apple.CoreSimulator.SimRuntime.watchOS-27-2': [
      sim(
        'Apple Watch Series 11 (46mm)',
        '55555555-5555-5555-5555-555555555555',
        'Apple-Watch-Series-11-46mm',
        'Booted',
      ),
    ],
  },
  runtimes: [
    {
      identifier: 'com.apple.CoreSimulator.SimRuntime.iOS-27-2',
      version: '27.2',
      platform: 'iOS',
      name: 'iOS 27.2',
      isAvailable: true,
    },
    {
      identifier: 'com.apple.CoreSimulator.SimRuntime.iOS-17-5',
      version: '17.5',
      platform: 'iOS',
      name: 'iOS 17.5',
      isAvailable: true,
    },
  ],
};

const booted = (input: unknown, device?: string) =>
  execFileSync(process.execPath, [script, ...(device ? [device] : [])], {
    input: JSON.stringify(input),
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean)
    .map(line => line.split('\t'));

test('lists each booted iOS simulator with its version and whether it’s an iPad', () => {
  expect(booted(listing)).toEqual([
    [
      '27.2',
      'false',
      '11111111-1111-1111-1111-111111111111',
      'learnX iPhone 18 Pro',
    ],
    [
      '27.2',
      'true',
      '22222222-2222-2222-2222-222222222222',
      'learnX iPad Pro 11',
    ],
    [
      '17.5',
      'false',
      '44444444-4444-4444-4444-444444444444',
      'learnX iPhone 15',
    ],
  ]);
});

test('finds a device by name or UDID, exactly', () => {
  expect(booted(listing, 'learnX iPhone 15')).toEqual([
    [
      '17.5',
      'false',
      '44444444-4444-4444-4444-444444444444',
      'learnX iPhone 15',
    ],
  ]);
  expect(booted(listing, '22222222-2222-2222-2222-222222222222')).toEqual([
    [
      '27.2',
      'true',
      '22222222-2222-2222-2222-222222222222',
      'learnX iPad Pro 11',
    ],
  ]);
  // Not "learnX iPhone 18 Pro", nor a shut down one.
  expect(booted(listing, 'learnX iPhone')).toEqual([]);
  expect(booted(listing, 'learnX iPad Pro 13')).toEqual([]);
});

test('reads the version from the runtime identifier when the runtime isn’t listed', () => {
  expect(booted({ devices: listing.devices })).toContainEqual([
    '17.5',
    'false',
    '44444444-4444-4444-4444-444444444444',
    'learnX iPhone 15',
  ]);
});

test('reads a runtime made for one device type, as the iPhone Duo’s', () => {
  const duo = sim(
    'learnX iPhone Duo',
    '66666666-6666-6666-6666-666666666666',
    'iPhone-19-4',
    'Booted',
  );
  const runtime = 'com.apple.CoreSimulator.SimRuntime.iOS-27-2-iPhone19-4';
  const row = ['27.2', 'false', duo.udid, 'learnX iPhone Duo'];
  expect(
    booted({
      devices: { [runtime]: [duo] },
      runtimes: [{ identifier: runtime, version: '27.2', platform: 'iOS' }],
    }),
  ).toEqual([row]);
  expect(booted({ devices: { [runtime]: [duo] } })).toEqual([row]);
});

test('lists nothing when no simulator is booted', () => {
  expect(booted({ devices: {}, runtimes: [] })).toEqual([]);
});
