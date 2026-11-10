import type * as ReactNative from 'react-native';
import { PlatformColor } from 'react-native';
import { renderHook } from '@testing-library/react-native';
import * as theme from 'theme';

/** The theme hooks, following the system appearance. */

const RN: typeof ReactNative = require('react-native');

const scheme = (value: 'light' | 'dark') =>
  jest.spyOn(RN, 'useColorScheme').mockReturnValue(value);

afterEach(() => jest.restoreAllMocks());

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
});
