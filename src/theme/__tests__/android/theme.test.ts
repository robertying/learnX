import * as ReactNative from 'react-native';
import { renderHook } from '@testing-library/react-native';
import {
  BrandDarkTheme,
  BrandLightTheme,
  brandColors,
  MaterialColors,
  StatusTone,
  useComposeColorOverrides,
} from 'theme';

// Android: Material 3 roles and custom colors, all plain `rgb(…)` strings.

const toRgb = (hex: string) =>
  `rgb(${[1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;

const luminance = (rgb: string) => {
  const [r, g, b] = (rgb.match(/\d+/g) ?? []).map(c => {
    const v = Number(c) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const tones: StatusTone[] = [
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'grey',
];

describe.each([
  ['light', BrandLightTheme, brandColors.light],
  ['dark', BrandDarkTheme, brandColors.dark],
])('%s theme', (_, theme, brand) => {
  const colors = theme.colors as MaterialColors;

  it('uses only plain colors', () => {
    const values = Object.values(colors).flatMap(value =>
      typeof value === 'object' ? Object.values(value) : [value],
    );
    for (const value of values) {
      expect(value).toMatch(/^rgba?\(/);
    }
  });

  it('has the brand color as primary', () => {
    expect(colors.primary).toBe(toRgb(brand));
  });

  it.each(tones)('keeps %s readable', tone => {
    // flags and warnings on the surface
    expect(
      contrast(colors.status[tone], colors.surface),
    ).toBeGreaterThanOrEqual(3);
    // pills
    expect(
      contrast(colors.onStatusContainer[tone], colors.statusContainer[tone]),
    ).toBeGreaterThanOrEqual(4.5);
    // text on the solid color
    expect(
      contrast(colors.onStatus[tone], colors.status[tone]),
    ).toBeGreaterThanOrEqual(4.5);
  });
});

describe('Compose hosts', () => {
  it.each([
    ['light', BrandLightTheme],
    ['dark', BrandDarkTheme],
  ] as const)(
    'take the %s theme roles as their palette',
    async (scheme, theme) => {
      jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue(scheme);
      const { result } = await renderHook(() => useComposeColorOverrides());
      const colors = theme.colors as MaterialColors;
      for (const role of [
        'primary',
        'onPrimary',
        'primaryContainer',
        'surface',
        'surfaceContainer',
        'onSurface',
        'onSurfaceVariant',
        'outline',
        'outlineVariant',
        'error',
      ] as const) {
        expect([role, toRgb(result.current[role])]).toEqual([
          role,
          colors[role],
        ]);
      }
    },
  );
});
