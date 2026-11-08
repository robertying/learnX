import { Platform, useColorScheme } from 'react-native';
import {
  DefaultTheme as NavigationDefaultTheme,
  DarkTheme as NavigationDarkTheme,
} from '@react-navigation/native';

/**
 * The brand color: Tsinghua purple, and the lighter tone of it used in dark
 * mode. The iOS `ThemeColor` asset, Android's `colors.xml`, `Colors.theme` and
 * the widgets use these same two values (checked by `brand.test.ts`).
 */
export const brandColors = { light: '#660874', dark: '#F4ABFF' } as const;

// Material 3 tokens from `@material/material-color-utilities`
// (`SchemeTonalSpot`, seed #660874), with the primary roles set to the brand
// colors above. Android uses them as they are, matching the native Form, which
// generates its own scheme from the same seed.
const materialLight = {
  primary: 'rgb(102, 8, 116)',
  onPrimary: 'rgb(255, 255, 255)',
  primaryContainer: 'rgb(255, 214, 253)',
  onPrimaryContainer: 'rgb(54, 0, 63)',
  secondary: 'rgb(108, 88, 107)',
  onSecondary: 'rgb(255, 255, 255)',
  secondaryContainer: 'rgb(245, 219, 241)',
  onSecondaryContainer: 'rgb(83, 65, 82)',
  error: 'rgb(186, 26, 26)',
  onError: 'rgb(255, 255, 255)',
  errorContainer: 'rgb(255, 218, 214)',
  onErrorContainer: 'rgb(147, 0, 10)',
  background: 'rgb(255, 247, 250)',
  onBackground: 'rgb(31, 26, 31)',
  surface: 'rgb(255, 247, 250)',
  onSurface: 'rgb(31, 26, 31)',
  surfaceVariant: 'rgb(237, 223, 232)',
  onSurfaceVariant: 'rgb(77, 68, 76)',
  surfaceContainer: 'rgb(246, 235, 242)',
  outline: 'rgb(127, 116, 124)',
  outlineVariant: 'rgb(208, 195, 204)',
  inversePrimary: 'rgb(244, 171, 255)',
};
const materialDark: typeof materialLight = {
  primary: 'rgb(244, 171, 255)',
  onPrimary: 'rgb(88, 0, 101)',
  primaryContainer: 'rgb(117, 29, 130)',
  onPrimaryContainer: 'rgb(255, 214, 253)',
  secondary: 'rgb(216, 191, 213)',
  onSecondary: 'rgb(59, 43, 59)',
  secondaryContainer: 'rgb(83, 65, 82)',
  onSecondaryContainer: 'rgb(245, 219, 241)',
  error: 'rgb(255, 180, 171)',
  onError: 'rgb(105, 0, 5)',
  errorContainer: 'rgb(147, 0, 10)',
  onErrorContainer: 'rgb(255, 218, 214)',
  background: 'rgb(23, 18, 22)',
  onBackground: 'rgb(235, 223, 230)',
  surface: 'rgb(23, 18, 22)',
  onSurface: 'rgb(235, 223, 230)',
  surfaceVariant: 'rgb(77, 68, 76)',
  onSurfaceVariant: 'rgb(208, 195, 204)',
  surfaceContainer: 'rgb(35, 30, 35)',
  outline: 'rgb(153, 141, 150)',
  outlineVariant: 'rgb(77, 68, 76)',
  inversePrimary: 'rgb(102, 8, 116)',
};

// iOS and Mac use the system's neutral backgrounds and labels instead of the
// purple-tinted Material ones, so the JS screens match the native Form screens.
const iosNeutralLight: Partial<typeof materialLight> = {
  background: 'rgb(255, 255, 255)', // systemBackground
  onBackground: 'rgb(0, 0, 0)', // label
  surface: 'rgb(255, 255, 255)',
  onSurface: 'rgb(0, 0, 0)',
  surfaceVariant: 'rgb(229, 229, 234)', // systemGray5
  onSurfaceVariant: 'rgb(108, 108, 112)',
  surfaceContainer: 'rgb(242, 242, 247)', // secondarySystemBackground
  outline: 'rgb(142, 142, 147)', // systemGray
  outlineVariant: 'rgb(198, 198, 200)', // opaqueSeparator
};
const iosNeutralDark: Partial<typeof materialLight> = {
  background: 'rgb(0, 0, 0)',
  onBackground: 'rgb(255, 255, 255)',
  surface: 'rgb(0, 0, 0)',
  onSurface: 'rgb(255, 255, 255)',
  surfaceVariant: 'rgb(44, 44, 46)',
  onSurfaceVariant: 'rgb(174, 174, 178)',
  surfaceContainer: 'rgb(28, 28, 30)',
  outline: 'rgb(142, 142, 147)',
  outlineVariant: 'rgb(56, 56, 58)',
};

/**
 * Status colors for icons and badges: Apple's system colors, which also read
 * well next to Material components on Android.
 */
export const statusColors = {
  light: {
    red: 'rgb(255, 59, 48)',
    orange: 'rgb(255, 149, 0)',
    yellow: 'rgb(255, 204, 0)',
    green: 'rgb(52, 199, 89)',
    blue: 'rgb(0, 122, 255)',
    grey: 'rgb(142, 142, 147)',
  },
  dark: {
    red: 'rgb(255, 69, 58)',
    orange: 'rgb(255, 159, 10)',
    yellow: 'rgb(255, 214, 10)',
    green: 'rgb(48, 209, 88)',
    blue: 'rgb(10, 132, 255)',
    grey: 'rgb(152, 152, 157)',
  },
};

/** Adds an alpha channel to an `rgb(r, g, b)` color. */
export const withAlpha = (rgb: string, alpha: number) =>
  rgb.replace(/^rgb\((.*)\)$/, `rgba($1, ${alpha})`);

const luminance = (rgb: string) => {
  const [r, g, b] = (rgb.match(/\d+/g) ?? []).map(c => {
    const v = Number(c) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * Text color on a solid `rgb(r, g, b)` background, such as a status badge:
 * white while it keeps 3:1 contrast, black otherwise.
 */
export const textOn = (rgb: string) =>
  1.05 / (luminance(rgb) + 0.05) >= 3 ? 'white' : 'black';

const buildColors = (dark: boolean) => {
  const material = dark ? materialDark : materialLight;
  const colors = {
    ...material,
    ...(Platform.OS === 'ios' ? (dark ? iosNeutralDark : iosNeutralLight) : {}),
  };
  return {
    ...colors,
    // React Navigation's own keys
    text: colors.onSurface,
    // Header and tab bar: plain system background on iOS and Mac
    card: Platform.OS === 'ios' ? colors.background : colors.surfaceContainer,
    border: colors.outlineVariant,
    notification: colors.error,
    // Titles and body text, and captions
    onSurfaceHigh: withAlpha(colors.onSurface, 0.87),
    onSurfaceMedium: withAlpha(colors.onSurface, 0.54),
    surfaceDisabled: withAlpha(colors.onSurface, 0.12),
    onSurfaceDisabled: withAlpha(colors.onSurface, 0.38),
    status: dark ? statusColors.dark : statusColors.light,
  };
};

export type ThemeColors = ReturnType<typeof buildColors>;

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
}

export const BrandLightTheme: Theme = {
  dark: false,
  colors: buildColors(false),
};
export const BrandDarkTheme: Theme = { dark: true, colors: buildColors(true) };

export const BrandLightNavigationTheme = {
  ...NavigationDefaultTheme,
  colors: BrandLightTheme.colors,
};
export const BrandDarkNavigationTheme = {
  ...NavigationDarkTheme,
  colors: BrandDarkTheme.colors,
};

/** The app's colors for the system appearance. Use this in components. */
export const useTheme = (): Theme =>
  useColorScheme() === 'dark' ? BrandDarkTheme : BrandLightTheme;

/** The React Navigation theme for the system appearance. */
export const useNavigationTheme = () =>
  useColorScheme() === 'dark'
    ? BrandDarkNavigationTheme
    : BrandLightNavigationTheme;
