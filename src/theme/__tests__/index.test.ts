import type * as ReactNative from 'react-native';
import { PlatformColor } from 'react-native';
import { renderHook } from '@testing-library/react-native';
import * as theme from 'theme';

/** The theme hooks, following the system appearance. */

const RN: typeof ReactNative = require('react-native');

const scheme = (value: 'light' | 'dark') =>
  jest.spyOn(RN, 'useColorScheme').mockReturnValue(value);

it('follows the system appearance', async () => {
  scheme('dark');
  const { result } = await renderHook(() => ({
    theme: theme.useTheme(),
    navigation: theme.useNavigationTheme(),
    compose: theme.useComposeColorOverrides(),
  }));
  expect(result.current.theme).toBe(theme.BrandDarkTheme);
  expect(result.current.navigation).toBe(theme.BrandDarkNavigationTheme);
  const darkOverrides = result.current.compose;
  scheme('light');
  const light = await renderHook(() => theme.useComposeColorOverrides());
  expect(light.result.current).not.toEqual(darkOverrides);
});

describe('on iOS and Mac', () => {
  const { colors } = theme.BrandLightTheme;

  it('uses system colors, which follow dark mode and Increase Contrast', () => {
    expect(colors.background).toEqual(PlatformColor('systemBackground'));
    expect(colors.onSurfaceHigh).toEqual(PlatformColor('label'));
    expect(colors.onSurfaceMedium).toEqual(PlatformColor('secondaryLabel'));
    expect(colors.border).toEqual(PlatformColor('opaqueSeparator'));
    expect(colors.status).toEqual({
      red: PlatformColor('systemRed'),
      orange: PlatformColor('systemOrange'),
      yellow: PlatformColor('systemYellow'),
      green: PlatformColor('systemGreen'),
      blue: PlatformColor('systemBlue'),
      grey: PlatformColor('systemGray'),
    });
    // The same system colors in dark mode: they adapt by themselves.
    expect(theme.BrandDarkTheme.colors.status).toEqual(colors.status);
  });

  it('keeps no Material colors', () => {
    // Plain strings are only the brand color, white on it, and React
    // Navigation's badge color, which it parses itself.
    const strings = Object.entries(colors).filter(
      ([, value]) => typeof value === 'string',
    );
    expect(strings).toEqual([
      ['primary', theme.brandColors.light],
      ['onPrimary', 'white'],
      ['onPrimaryContainer', theme.brandColors.light],
      ['onError', 'white'],
      ['notification', 'red'],
    ]);
  });

  it('gives web content CSS colors: WebKit text and the brand links', () => {
    expect(theme.webContentColors(true)).toEqual({
      textColor: 'CanvasText',
      linkColor: theme.brandColors.dark,
    });
  });

  describe('status text', () => {
    // UIKit's system colors (light, dark), which pills tint with.
    const system: Record<theme.StatusTone, [string, string]> = {
      red: ['#FF3B30', '#FF453A'],
      orange: ['#FF9500', '#FF9F0A'],
      yellow: ['#FFCC00', '#FFD60A'],
      green: ['#34C759', '#30D158'],
      blue: ['#007AFF', '#0A84FF'],
      grey: ['#8E8E93', '#8E8E93'],
    };
    const channels = (hex: string) =>
      [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    // `color` at `alpha` over `under`, as the pill's tint draws.
    const over = (color: string, under: string, alpha: number) =>
      `#${channels(color)
        .map((c, i) =>
          Math.round(c * alpha + channels(under)[i] * (1 - alpha))
            .toString(16)
            .padStart(2, '0'),
        )
        .join('')}`;
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
    const tones = Object.keys(system) as theme.StatusTone[];
    const tint = theme.statusContainerOpacity;

    it.each(tones)('keeps %s text readable on its pill', tone => {
      const text = theme.appleStatusText[tone];
      const [light, dark] = system[tone];
      // Light: on the grouped gray, the darkest background a pill sits on
      expect(
        contrast(text.light, over(light, '#F2F2F7', tint)),
      ).toBeGreaterThanOrEqual(4.5);
      // Dark: list cards are on black
      expect(
        contrast(text.dark, over(dark, '#000000', tint)),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(text.highContrastDark, over(dark, '#000000', tint)),
      ).toBeGreaterThanOrEqual(4.5);
      // Dark mode keeps the system color itself
      expect(text.dark).toBe(dark);
    });

    it('draws status text in those shades, following the appearance', () => {
      expect(colors.onStatusContainer.green).toEqual(
        RN.DynamicColorIOS({
          light: '#1F7534',
          dark: '#30D158',
          highContrastLight: '#1F7534',
          highContrastDark: '#30DB5B',
        }),
      );
    });
  });
});
