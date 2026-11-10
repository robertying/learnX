import type * as ReactNative from 'react-native';
import { act, renderHook } from '@testing-library/react-native';

/**
 * The theme hooks, following the system appearance and iOS's Increase
 * Contrast. The module subscribes to Increase Contrast as it loads, so the
 * listener is caught before it is required.
 */

const RN: typeof ReactNative = require('react-native');
let contrastListener: (enabled: boolean) => void = () => {};
jest.spyOn(RN.AccessibilityInfo, 'addEventListener').mockImplementation(((
  _: string,
  listener: (enabled: boolean) => void,
) => {
  contrastListener = listener;
  return { remove: () => {} };
}) as never);
jest
  .spyOn(RN.AccessibilityInfo, 'isDarkerSystemColorsEnabled')
  .mockResolvedValue(false);

const theme: typeof import('theme') = require('theme');

const scheme = (value: 'light' | 'dark') =>
  jest.spyOn(RN, 'useColorScheme').mockReturnValue(value);

afterEach(async () => {
  await act(() => contrastListener(false));
  jest.mocked(RN.useColorScheme).mockRestore?.();
});

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

it('switches to darker colors with Increase Contrast, live', async () => {
  scheme('light');
  const { result } = await renderHook(() => theme.useTheme());
  expect(result.current).toBe(theme.BrandLightTheme);

  await act(() => contrastListener(true));
  expect(result.current).not.toBe(theme.BrandLightTheme);
  expect(result.current.dark).toBe(false);
  // The same setting again changes nothing.
  const contrasted = result.current;
  await act(() => contrastListener(true));
  expect(result.current).toBe(contrasted);

  scheme('dark');
  const dark = await renderHook(() => theme.useTheme());
  expect(dark.result.current.dark).toBe(true);
  expect(dark.result.current).not.toBe(theme.BrandDarkTheme);
});

it('writes white on dark colors and black on light ones', () => {
  expect(theme.textOn('rgb(102, 8, 116)')).toBe('white');
  expect(theme.textOn('rgb(255, 214, 10)')).toBe('black');
  // Unreadable as a color: black, as on a light background
  expect(theme.textOn('purple')).toBe('black');
});
