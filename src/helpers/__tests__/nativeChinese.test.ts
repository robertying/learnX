// The native strings are Simplified Chinese only. Traditional Chinese locales
// (Hong Kong, Taiwan, Macau) don't fall back to Simplified on iOS or Android,
// so each catalog and resource folder repeats the Simplified strings for them,
// as the JS side (helpers/i18n) also shows Simplified there.

// The app's tsconfig has no Node types; Jest runs in Node from the repo root.
const { readdirSync, readFileSync } = require('fs') as {
  readdirSync: (path: string) => string[];
  readFileSync: (path: string, encoding: 'utf8') => string;
};

type Catalog = {
  strings: Record<string, { localizations?: Record<string, unknown> }>;
};

it.each([
  'ios/learnX/InfoPlist.xcstrings',
  'ios/learnX/Localizable.xcstrings',
  'ios/learnX/AppShortcuts.xcstrings',
  'ios/ExpoWidgetsTarget/Localizable.xcstrings',
])('%s gives zh-Hant the zh-Hans strings', file => {
  const catalog: Catalog = JSON.parse(readFileSync(file, 'utf8'));
  for (const [key, { localizations = {} }] of Object.entries(catalog.strings)) {
    expect([key, localizations['zh-Hant']]).toEqual([
      key,
      localizations['zh-Hans'],
    ]);
  }
});

it('repeats values-zh in values-b+zh+Hant on Android', () => {
  const res = 'android/app/src/main/res';
  const simplified = readdirSync(`${res}/values-zh`).sort();
  expect(readdirSync(`${res}/values-b+zh+Hant`).sort()).toEqual(simplified);
  for (const file of simplified) {
    expect(readFileSync(`${res}/values-b+zh+Hant/${file}`, 'utf8')).toBe(
      readFileSync(`${res}/values-zh/${file}`, 'utf8'),
    );
  }
});
