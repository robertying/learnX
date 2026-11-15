// The native strings are Simplified Chinese only. Traditional Chinese locales
// (Hong Kong, Taiwan, Macau) don't fall back to Simplified on iOS or Android,
// so each catalog and resource folder repeats the Simplified strings for them,
// as the JS side (helpers/i18n) also shows Simplified there.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '../..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const list = (path: string) => readdirSync(join(root, path)).sort();

type Catalog = {
  strings: Record<string, { localizations?: Record<string, unknown> }>;
};

it.each([
  'ios/learnX/InfoPlist.xcstrings',
  'ios/learnX/Localizable.xcstrings',
  'ios/learnX/AppShortcuts.xcstrings',
  'ios/ExpoWidgetsTarget/Localizable.xcstrings',
])('%s gives zh-Hant the zh-Hans strings', file => {
  const catalog: Catalog = JSON.parse(read(file));
  for (const [key, { localizations = {} }] of Object.entries(catalog.strings)) {
    expect([key, localizations['zh-Hant']]).toEqual([
      key,
      localizations['zh-Hans'],
    ]);
  }
});

it('repeats values-zh in values-b+zh+Hant on Android', () => {
  const res = 'android/app/src/main/res';
  const simplified = list(`${res}/values-zh`);
  expect(list(`${res}/values-b+zh+Hant`)).toEqual(simplified);
  for (const file of simplified) {
    expect(read(`${res}/values-b+zh+Hant/${file}`)).toBe(
      read(`${res}/values-zh/${file}`),
    );
  }
});
