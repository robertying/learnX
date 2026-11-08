import { useColorScheme } from 'react-native';
import {
  DefaultTheme as NavigationDefaultTheme,
  DarkTheme as NavigationDarkTheme,
} from '@react-navigation/native';

// React Navigation's own color keys, as the app had them from Paper's
// adaptNavigationTheme (Material 3 baseline colors).
const navigationLightColors = {
  card: 'rgb(243, 237, 246)',
  text: 'rgba(28, 27, 31, 1)',
  border: 'rgba(121, 116, 126, 1)',
  notification: 'rgba(179, 38, 30, 1)',
};
const navigationDarkColors = {
  card: 'rgb(44, 40, 49)',
  text: 'rgba(230, 225, 229, 1)',
  border: 'rgba(147, 143, 153, 1)',
  notification: 'rgba(242, 184, 181, 1)',
};

const lightThemeColors = {
  ...navigationLightColors,
  primary: 'rgb(154, 37, 174)',
  onPrimary: 'rgb(255, 255, 255)',
  primaryContainer: 'rgb(255, 214, 254)',
  onPrimaryContainer: 'rgb(53, 0, 63)',
  secondary: 'rgb(107, 88, 107)',
  onSecondary: 'rgb(255, 255, 255)',
  secondaryContainer: 'rgb(244, 219, 241)',
  onSecondaryContainer: 'rgb(37, 22, 38)',
  tertiary: 'rgb(130, 82, 74)',
  onTertiary: 'rgb(255, 255, 255)',
  tertiaryContainer: 'rgb(255, 218, 212)',
  onTertiaryContainer: 'rgb(51, 17, 12)',
  error: 'rgb(186, 26, 26)',
  onError: 'rgb(255, 255, 255)',
  errorContainer: 'rgb(255, 218, 214)',
  onErrorContainer: 'rgb(65, 0, 2)',
  background: 'rgb(255, 251, 255)',
  onBackground: 'rgb(30, 26, 29)',
  surface: 'rgb(255, 251, 255)',
  onSurface: 'rgb(30, 26, 29)',
  surfaceVariant: 'rgb(236, 223, 232)',
  onSurfaceVariant: 'rgb(77, 68, 76)',
  outline: 'rgb(127, 116, 125)',
  outlineVariant: 'rgb(208, 195, 204)',
  shadow: 'rgb(0, 0, 0)',
  scrim: 'rgb(0, 0, 0)',
  inverseSurface: 'rgb(51, 47, 50)',
  inverseOnSurface: 'rgb(247, 238, 243)',
  inversePrimary: 'rgb(249, 171, 255)',
  elevation: {
    level0: 'transparent',
    level1: 'rgb(250, 240, 251)',
    level2: 'rgb(247, 234, 249)',
    level3: 'rgb(244, 228, 246)',
    level4: 'rgb(243, 225, 245)',
    level5: 'rgb(241, 221, 244)',
  },
  surfaceDisabled: 'rgba(30, 26, 29, 0.12)',
  onSurfaceDisabled: 'rgba(30, 26, 29, 0.38)',
  backdrop: 'rgba(54, 46, 53, 0.4)',
};
const darkThemeColors = {
  ...navigationDarkColors,
  primary: 'rgb(208, 120, 220)',
  onPrimary: 'rgb(87, 0, 102)',
  primaryContainer: 'rgb(123, 0, 143)',
  onPrimaryContainer: 'rgb(255, 214, 254)',
  secondary: 'rgb(215, 191, 213)',
  onSecondary: 'rgb(59, 43, 60)',
  secondaryContainer: 'rgb(83, 65, 83)',
  onSecondaryContainer: 'rgb(244, 219, 241)',
  tertiary: 'rgb(246, 184, 173)',
  onTertiary: 'rgb(76, 37, 31)',
  tertiaryContainer: 'rgb(103, 59, 52)',
  onTertiaryContainer: 'rgb(255, 218, 212)',
  error: 'rgb(255, 180, 171)',
  onError: 'rgb(105, 0, 5)',
  errorContainer: 'rgb(147, 0, 10)',
  onErrorContainer: 'rgb(255, 180, 171)',
  background: 'rgb(30, 26, 29)',
  onBackground: 'rgb(233, 224, 228)',
  surface: 'rgb(30, 26, 29)',
  onSurface: 'rgb(233, 224, 228)',
  surfaceVariant: 'rgb(77, 68, 76)',
  onSurfaceVariant: 'rgb(208, 195, 204)',
  outline: 'rgb(153, 141, 150)',
  outlineVariant: 'rgb(77, 68, 76)',
  shadow: 'rgb(0, 0, 0)',
  scrim: 'rgb(0, 0, 0)',
  inverseSurface: 'rgb(233, 224, 228)',
  inverseOnSurface: 'rgb(51, 47, 50)',
  inversePrimary: 'rgb(154, 37, 174)',
  elevation: {
    level0: 'transparent',
    level1: 'rgb(41, 33, 40)',
    level2: 'rgb(48, 38, 47)',
    level3: 'rgb(54, 42, 54)',
    level4: 'rgb(56, 43, 56)',
    level5: 'rgb(61, 46, 61)',
  },
  surfaceDisabled: 'rgba(233, 224, 228, 0.12)',
  onSurfaceDisabled: 'rgba(233, 224, 228, 0.38)',
  backdrop: 'rgba(54, 46, 53, 0.4)',
};
/** Adds an alpha channel to an `rgb(r, g, b)` color. */
export const withAlpha = (rgb: string, alpha: number) =>
  rgb.replace(/^rgb\((.*)\)$/, `rgba($1, ${alpha})`);

/**
 * Text colors on top of `onSurface`: `onSurfaceHigh` for titles and body
 * text, `onSurfaceMedium` for captions.
 */
const textColors = (colors: typeof lightThemeColors) => ({
  onSurfaceHigh: withAlpha(colors.onSurface, 0.87),
  onSurfaceMedium: withAlpha(colors.onSurface, 0.54),
});

export type ThemeColors = typeof lightThemeColors &
  ReturnType<typeof textColors>;

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
}

export const BrandLightTheme: Theme = {
  dark: false,
  colors: { ...lightThemeColors, ...textColors(lightThemeColors) },
};
export const BrandDarkTheme: Theme = {
  dark: true,
  colors: { ...darkThemeColors, ...textColors(darkThemeColors) },
};

export const BrandLightNavigationTheme = {
  ...NavigationDefaultTheme,
  colors: lightThemeColors,
};
export const BrandDarkNavigationTheme = {
  ...NavigationDarkTheme,
  colors: darkThemeColors,
};

/** The app's colors for the system appearance. Use this in components. */
export const useTheme = (): Theme =>
  useColorScheme() === 'dark' ? BrandDarkTheme : BrandLightTheme;

/** The React Navigation theme for the system appearance. */
export const useNavigationTheme = () =>
  useColorScheme() === 'dark'
    ? BrandDarkNavigationTheme
    : BrandLightNavigationTheme;
