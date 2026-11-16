import { brandRamp } from 'theme/electron';
import { fluentIcon, fluentIcons } from 'web/fluentIcons';
import {
  fluentDarkTheme,
  fluentLightTheme,
  fluentTheme,
} from 'web/fluentTheme';
import { systemIcons } from 'helpers/systemIcons';

const channels = (hex: string) =>
  [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const luminance = (hex: string) => {
  const [r, g, b] = channels(hex).map(c => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

it('draws every icon the app names', () => {
  for (const { windows } of Object.values(systemIcons)) {
    expect([windows, typeof fluentIcons[windows]]).toEqual([windows, 'object']);
  }
  expect(fluentIcon('AlertRegular', true)).not.toBe(fluentIcon('AlertRegular'));
  // No filled variant: the regular one
  expect(fluentIcon('KeyRegular', true)).toBe(fluentIcons.KeyRegular);
});

it('fills and writes with the brand color in light mode', () => {
  expect(fluentTheme(false)).toBe(fluentLightTheme);
  expect(fluentLightTheme.colorBrandBackground).toBe(brandRamp[80]);
  expect(fluentLightTheme.colorBrandForeground1).toBe(brandRamp[80]);
  expect(contrast('#FFFFFF', brandRamp[80])).toBeGreaterThanOrEqual(4.5);
});

it('keeps brand text readable on the dark surfaces', () => {
  expect(fluentTheme(true)).toBe(fluentDarkTheme);
  for (const surface of ['#292929', '#1F1F1F', '#141414']) {
    expect(
      contrast(fluentDarkTheme.colorBrandForeground1, surface),
    ).toBeGreaterThanOrEqual(4.5);
  }
  // White on the dark theme's filled buttons
  expect(
    contrast('#FFFFFF', fluentDarkTheme.colorBrandBackground),
  ).toBeGreaterThanOrEqual(4.5);
});
