import { BrandDarkTheme, BrandLightTheme, shade, withAlpha } from 'theme';

const channels = (rgb: string) => (rgb.match(/[\d.]+/g) ?? []).map(Number);

const luminance = (rgb: string) => {
  const [r, g, b] = channels(rgb).map(c => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** An `rgba(…)` color laid over a solid `rgb(…)` one. */
const over = (rgba: string, rgb: string) => {
  const [r, g, b, a = 1] = channels(rgba);
  const base = channels(rgb);
  return `rgb(${[r, g, b].map((c, i) => c * a + base[i] * (1 - a)).join(', ')})`;
};

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe.each([
  ['light', BrandLightTheme],
  ['dark', BrandDarkTheme],
])('%s theme', (_, theme) => {
  const { surface, status, primary } = theme.colors;
  const pillText = (color: string) => (theme.dark ? color : shade(color, 0.8));

  it.each(['red', 'orange', 'green'] as const)(
    'keeps %s text and glyphs readable on the surface',
    color => {
      // the deadline warning in forms, the important flag
      expect(contrast(status[color], surface)).toBeGreaterThanOrEqual(3);
    },
  );

  it.each([
    ['submitted', status.green],
    ['due soon', status.red],
    ['grade', primary],
  ])('keeps the %s pill at 4.5:1', (__, color) => {
    const tint = over(withAlpha(color, 0.15), surface);
    expect(contrast(pillText(color), tint)).toBeGreaterThanOrEqual(4.5);
  });
});
