import { materialCodepoints, systemIcons } from 'helpers/systemIcons';

// expo-symbols' table of the font's codepoints, which it doesn't export
const symbols: Record<
  string,
  number
> = require('../../../node_modules/expo-symbols/build/android/symbols.json');

describe('systemIcons', () => {
  it('knows where each Material Symbol is in the font', () => {
    for (const { android } of Object.values(systemIcons)) {
      expect([android, materialCodepoints[android]]).toEqual([
        android,
        symbols[android],
      ]);
    }
  });
});
