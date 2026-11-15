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
  ['dark', BrandDarkTheme, brandColors.materialDark],
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

  it("is the native theme's palette (colors.xml)", () => {
    // AppTheme (res/values/styles.xml) colors the splash screen and native
    // views such as alert dialogs with these copies.
    const { readFileSync } = require('fs') as {
      readFileSync: (path: string, encoding: 'utf8') => string;
    };
    const xml = readFileSync(
      `android/app/src/main/res/values${theme.dark ? '-night' : ''}/colors.xml`,
      'utf8',
    );
    const native = Object.fromEntries(
      [...xml.matchAll(/name="md_theme_(\w+)">(#[0-9A-F]{6})</gi)].map(
        ([, role, hex]) => [role, toRgb(hex)],
      ),
    );
    const js: Record<string, unknown> = {
      ...colors,
      errorContainer: colors.statusContainer.red,
      onErrorContainer: colors.onStatusContainer.red,
    };
    // The roles the app's own views use; the secondary, tertiary and inverse
    // ones only reach native views.
    const shared = Object.keys(native).filter(role => role in js);
    expect(shared).toHaveLength(18);
    for (const role of shared) {
      expect([role, native[role]]).toEqual([role, js[role]]);
    }
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

describe('Android widget colors', () => {
  // The widgets run without the app's modules, so their kit keeps its own
  // copies.
  const { readFileSync } = require('fs') as {
    readFileSync: (path: string, encoding: 'utf8') => string;
  };
  const read = (file: string) =>
    readFileSync(`src/widgets/${file}.tsx`, 'utf8');

  it('are the Material roles, in the kit', () => {
    const source = read('kit.android');
    // The colors in the object literal that starts at `from`.
    const palette = (from: number) =>
      Object.fromEntries(
        [
          ...source
            .slice(from, source.indexOf('}', from))
            .matchAll(/(\w+): '(#[0-9A-F]{6})'/gi),
        ].map(([, key, hex]) => [key, toRgb(hex)]),
      );
    const kit = {
      dark: palette(source.indexOf('? {')),
      light: palette(source.indexOf(': {')),
    };
    for (const theme of [BrandLightTheme, BrandDarkTheme]) {
      const colors = theme.colors as MaterialColors;
      expect(kit[theme.dark ? 'dark' : 'light']).toEqual({
        background: colors.surface,
        title: colors.onSurface,
        caption: colors.onSurfaceVariant,
        accent: colors.primary,
        // due times
        red: colors.status.red,
        orange: colors.status.orange,
      });
    }
  });

  it.each(['Deadlines.android', 'UpNext.android'])(
    '%s takes its colors from the kit',
    widget => {
      expect(read(widget)).not.toMatch(/'#[0-9A-F]{6}'/i);
    },
  );
});
