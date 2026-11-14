import {
  ColorValue,
  DynamicColorIOS,
  Platform,
  PlatformColor,
  useColorScheme,
} from 'react-native';
import {
  DefaultTheme as NavigationDefaultTheme,
  DarkTheme as NavigationDarkTheme,
} from '@react-navigation/native';

/**
 * The brand color: Tsinghua purple, and the lighter tone of it used in dark
 * mode. The iOS `ThemeColor` asset, Android's `colors.xml`, `brandColor` and
 * the widgets use these same two values (checked by `brand.test.ts`).
 */
export const brandColors = { light: '#660874', dark: '#F4ABFF' } as const;

/**
 * The brand color behind white, in the iOS and Mac controls that fill with
 * the tint: filled buttons and switches. The dark tone above is Material's
 * primary for dark mode, which expects a dark label on it; under the system's
 * white label or switch knob it is 1.7:1. This one keeps the brand hue at a
 * mid lightness: white on it is 4.7:1, and it is 3.6:1 against a grouped row
 * in dark mode. Android's Material controls use the primary role and its dark
 * on-primary label instead.
 */
export const brandFillColors = { light: '#660874', dark: '#AC4ABC' } as const;

/**
 * The brand color for the system appearance, for static styles and options
 * that take one color (a dynamic color on iOS, the light one on Android).
 * Inside components, prefer `useTheme().colors.primary`.
 */
export const brandColor =
  Platform.OS === 'ios'
    ? (DynamicColorIOS(brandColors) as unknown as string)
    : brandColors.light;

// Material 3 tokens from `@material/material-color-utilities`
// (`SchemeTonalSpot`, seed #660874), with the primary roles set to the brand
// colors above. Android uses them as they are, in React Native views and as
// every Compose Host's palette (`useComposeColorOverrides`).
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

/** The status hues, for flags, pills, file types and swipe actions. */
export type StatusTone =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'grey';
type ToneColors<C = ColorValue> = Record<StatusTone, C>;

/**
 * Material 3 custom colors for the status hues Material has no role for,
 * from `@material/material-color-utilities` 0.3.0 (`customColor` with
 * blending, harmonized to the seed #660874, from Apple's hues): color, on color, container and on
 * container, for light and dark. Red is the error role.
 */
const materialCustom = {
  light: {
    orange: [
      'rgb(154, 70, 5)',
      'rgb(255, 255, 255)',
      'rgb(255, 219, 202)',
      'rgb(51, 18, 0)',
    ],
    yellow: [
      'rgb(128, 86, 0)',
      'rgb(255, 255, 255)',
      'rgb(255, 221, 176)',
      'rgb(40, 24, 0)',
    ],
    green: [
      'rgb(0, 108, 72)',
      'rgb(255, 255, 255)',
      'rgb(98, 253, 185)',
      'rgb(0, 33, 19)',
    ],
    blue: [
      'rgb(58, 76, 220)',
      'rgb(255, 255, 255)',
      'rgb(223, 224, 255)',
      'rgb(0, 10, 99)',
    ],
  },
  dark: {
    orange: [
      'rgb(255, 182, 142)',
      'rgb(84, 34, 0)',
      'rgb(119, 51, 0)',
      'rgb(255, 219, 202)',
    ],
    yellow: [
      'rgb(254, 186, 75)',
      'rgb(68, 44, 0)',
      'rgb(97, 64, 0)',
      'rgb(255, 221, 176)',
    ],
    green: [
      'rgb(61, 224, 158)',
      'rgb(0, 56, 35)',
      'rgb(0, 82, 53)',
      'rgb(98, 253, 185)',
    ],
    blue: [
      'rgb(188, 194, 255)',
      'rgb(0, 22, 156)',
      'rgb(26, 47, 197)',
      'rgb(223, 224, 255)',
    ],
  },
} as const;

/**
 * How strongly a status container shows: Material draws its container colors
 * as they are; iOS and Mac lay the system color itself over the surface at
 * this opacity, as Apple's own tinted capsules do.
 */
export const statusContainerOpacity = Platform.OS === 'ios' ? 0.15 : 1;

/** Adds an alpha channel to an `rgb(r, g, b)` color (Material colors only). */
export const withAlpha = (rgb: string, alpha: number) =>
  rgb.replace(/^rgb\((.*)\)$/, `rgba($1, ${alpha})`);

/** Android: Material 3 roles, and custom colors for the other status hues. */
const buildMaterialColors = (dark: boolean) => {
  const m = dark ? materialDark : materialLight;
  const custom = dark ? materialCustom.dark : materialCustom.light;
  const tones = (
    i: 0 | 1 | 2 | 3,
    red: string,
    grey: string,
  ): ToneColors<string> => ({
    red,
    orange: custom.orange[i],
    yellow: custom.yellow[i],
    green: custom.green[i],
    blue: custom.blue[i],
    grey,
  });
  return {
    primary: m.primary,
    primaryFill: m.primary,
    onPrimary: m.onPrimary,
    primaryContainer: m.primaryContainer,
    onPrimaryContainer: m.onPrimaryContainer,
    secondaryContainer: m.secondaryContainer,
    onSecondaryContainer: m.onSecondaryContainer,
    error: m.error,
    onError: m.onError,
    background: m.background,
    surface: m.surface,
    surfaceVariant: m.surfaceVariant,
    surfaceContainer: m.surfaceContainer,
    onSurface: m.onSurface,
    onSurfaceVariant: m.onSurfaceVariant,
    outline: m.outline,
    outlineVariant: m.outlineVariant,
    surfaceDisabled: withAlpha(m.onSurface, 0.12),
    onSurfaceDisabled: withAlpha(m.onSurface, 0.38),
    // Titles and body text, and captions
    onSurfaceHigh: m.onSurface,
    onSurfaceMedium: m.onSurfaceVariant,
    // React Navigation's own keys
    text: m.onSurface,
    card: m.surfaceContainer,
    border: m.outlineVariant,
    notification: m.error,
    status: tones(0, m.error, m.onSurfaceVariant),
    onStatus: tones(1, m.onError, m.surface),
    statusContainer: tones(2, m.errorContainer, m.surfaceVariant),
    onStatusContainer: tones(3, m.onErrorContainer, m.onSurfaceVariant),
  };
};

const mapTones = (f: (tone: StatusTone) => ColorValue): ToneColors => ({
  red: f('red'),
  orange: f('orange'),
  yellow: f('yellow'),
  green: f('green'),
  blue: f('blue'),
  grey: f('grey'),
});

/** Android's colors: plain `rgb(…)` strings. */
export type MaterialColors = ReturnType<typeof buildMaterialColors>;
type Widen<T> = {
  [K in keyof T]: T[K] extends string ? ColorValue : Widen<T[K]>;
};
/**
 * The theme's color roles. On iOS and Mac they are system colors, which can't
 * be parsed or blended in JS: give them to views as they are.
 */
type ColorRoles = Widen<MaterialColors>;

const system = (name: string) => PlatformColor(name);

/**
 * The status hues as text on Apple platforms, in pills, swipe buttons and
 * Form rows. The system colors are too light to read as text in light mode
 * (orange and green are about 2:1 on white), so light mode uses Apple's
 * Increase Contrast shade of each, darkened just enough for 4.5:1 on its own
 * 15% tint over the grouped background (tested in `__tests__/hooks.test.ts`).
 * Dark mode keeps the system color's own value, and Increase Contrast its
 * accessible dark shade.
 */
export const appleStatusText: Record<
  StatusTone,
  { light: string; dark: string; highContrastDark: string }
> = {
  red: { light: '#C40013', dark: '#FF453A', highContrastDark: '#FF6961' },
  orange: { light: '#BF3100', dark: '#FF9F0A', highContrastDark: '#FFB340' },
  yellow: { light: '#AB4D00', dark: '#FFD60A', highContrastDark: '#FFD426' },
  green: { light: '#1F7534', dark: '#30D158', highContrastDark: '#30DB5B' },
  blue: { light: '#0040DD', dark: '#0A84FF', highContrastDark: '#409CFF' },
  grey: { light: '#646468', dark: '#8E8E93', highContrastDark: '#AEAEB2' },
};

const statusText = (tone: StatusTone): ColorValue => {
  const { light, dark, highContrastDark } = appleStatusText[tone];
  return DynamicColorIOS({
    light,
    dark,
    highContrastLight: light,
    highContrastDark,
  });
};

/**
 * iOS, iPadOS and Mac: UIKit's dynamic system colors, which follow dark mode
 * and Increase Contrast by themselves, and the brand color as the tint.
 */
const buildAppleColors = (dark: boolean): ColorRoles => {
  const brand = dark ? brandColors.dark : brandColors.light;
  const label = system('label');
  const secondaryLabel = system('secondaryLabel');
  const background = system('systemBackground');
  const tones: ToneColors = {
    red: system('systemRed'),
    orange: system('systemOrange'),
    yellow: system('systemYellow'),
    green: system('systemGreen'),
    blue: system('systemBlue'),
    grey: system('systemGray'),
  };
  return {
    primary: brand,
    primaryFill: dark ? brandFillColors.dark : brandFillColors.light,
    onPrimary: 'white',
    primaryContainer: system('tertiarySystemFill'),
    onPrimaryContainer: brand,
    secondaryContainer: system('tertiarySystemFill'),
    onSecondaryContainer: label,
    error: tones.red,
    onError: 'white',
    background,
    surface: background,
    surfaceVariant: system('systemGray5'),
    surfaceContainer: system('secondarySystemBackground'),
    onSurface: label,
    onSurfaceVariant: secondaryLabel,
    outline: system('systemGray'),
    outlineVariant: system('opaqueSeparator'),
    surfaceDisabled: system('quaternarySystemFill'),
    onSurfaceDisabled: system('tertiaryLabel'),
    onSurfaceHigh: label,
    onSurfaceMedium: secondaryLabel,
    text: label,
    card: background,
    border: system('opaqueSeparator'),
    // native-stack reads this with the `color` package, which can't parse a
    // system color. It only colors header item badges with a count; the
    // iOS 26 dot is the system's own red.
    notification: 'red',
    status: tones,
    // White on the solid system colors, as Apple's own file badges, except
    // yellow, which is too light for it.
    onStatus: { ...mapTones(() => 'white'), yellow: 'black' } as ToneColors,
    // Drawn at `statusContainerOpacity` over the surface.
    statusContainer: tones,
    // Text and icons on that tint, and status text on a row.
    onStatusContainer: mapTones(statusText),
  };
};

const buildColors = (dark: boolean): ColorRoles =>
  Platform.OS === 'ios' ? buildAppleColors(dark) : buildMaterialColors(dark);

export type ThemeColors = ColorRoles;

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
}

export const BrandLightTheme: Theme = {
  dark: false,
  colors: buildColors(false),
};
export const BrandDarkTheme: Theme = { dark: true, colors: buildColors(true) };

// React Navigation types its colors as strings, but passes the ones it
// draws with (background, card, text, border, primary) on to native views,
// which take system colors too.
type NavigationColors = typeof NavigationDefaultTheme.colors;
export const BrandLightNavigationTheme = {
  ...NavigationDefaultTheme,
  colors: BrandLightTheme.colors as unknown as NavigationColors,
};
export const BrandDarkNavigationTheme = {
  ...NavigationDarkTheme,
  colors: BrandDarkTheme.colors as unknown as NavigationColors,
};

/**
 * Text and link colors for course-site HTML in a web view, which takes CSS
 * strings: WebKit's own text color on iOS and Mac (the label color), the
 * Material role on Android, and the brand color for links.
 */
export const webContentColors = (dark: boolean) => ({
  textColor:
    Platform.OS === 'ios'
      ? 'CanvasText'
      : (dark ? materialDark : materialLight).onSurface,
  linkColor: dark ? brandColors.dark : brandColors.light,
});

/**
 * Every Compose Host takes the whole Material palette above as its
 * `colorOverrides`, so Compose views and React Native views draw the same
 * colors. (Compose's own `SchemeTonalSpot` palette from the seed mutes the
 * primary roles, #7C4E7F instead of #660874, and may differ elsewhere.)
 */
const toHex = (rgb: string) =>
  `#${(rgb.match(/\d+/g) ?? [])
    .map(c => Number(c).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}` as const;
const hexRoles = (roles: typeof materialLight) =>
  Object.fromEntries(
    Object.entries(roles).map(([role, rgb]) => [role, toHex(rgb)]),
  ) as Record<keyof typeof materialLight, `#${string}`>;
const composeOverrides = {
  light: hexRoles(materialLight),
  dark: hexRoles(materialDark),
};

/** `colorOverrides` for a Compose Host, in the system appearance. */
export const useComposeColorOverrides = () =>
  useColorScheme() === 'dark' ? composeOverrides.dark : composeOverrides.light;

/**
 * The theme on Android, where its colors are plain strings, for Compose views
 * and color math. Only in Android code (`.android.tsx` files).
 */
export const useMaterialTheme = () =>
  useTheme() as { dark: boolean; colors: MaterialColors };

/** The app's colors for the system appearance. Use this in components. */
export const useTheme = (): Theme =>
  useColorScheme() === 'dark' ? BrandDarkTheme : BrandLightTheme;

/** The React Navigation theme for the system appearance. */
export const useNavigationTheme = () =>
  useColorScheme() === 'dark'
    ? BrandDarkNavigationTheme
    : BrandLightNavigationTheme;
