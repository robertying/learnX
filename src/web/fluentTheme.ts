import {
  createDarkTheme,
  createLightTheme,
  type BrandVariants,
  type Theme,
} from '@fluentui/react-components';
import { brandRamp } from 'theme/electron';

/**
 * Fluent 2's light and dark themes with the brand ramp (Tsinghua purple) as
 * the accent, for the Fluent UI components of the Electron app. The app's
 * own colors (`theme/electron`) are the same tokens, so React Native views
 * and Fluent controls match.
 */
const brand = brandRamp as unknown as BrandVariants;

export const fluentLightTheme: Theme = createLightTheme(brand);

export const fluentDarkTheme: Theme = {
  ...createDarkTheme(brand),
  // Text and links in the brand color, as the app's dark primary: 110 keeps
  // 4.5:1 on Fluent's darkest surfaces, where Fluent's own pick (100) is
  // just under it on neutralBackground1.
  colorBrandForeground1: brand[110],
  colorBrandForeground2: brand[120],
  colorBrandForegroundLink: brand[110],
  colorBrandForegroundLinkHover: brand[120],
  colorBrandForegroundLinkPressed: brand[130],
  colorNeutralForeground2BrandHover: brand[110],
  colorNeutralForeground2BrandPressed: brand[100],
  colorNeutralForeground2BrandSelected: brand[110],
  colorNeutralForeground3BrandHover: brand[110],
  colorNeutralForeground3BrandPressed: brand[100],
  colorNeutralForeground3BrandSelected: brand[110],
  colorCompoundBrandForeground1: brand[110],
  colorCompoundBrandForeground1Hover: brand[120],
  colorCompoundBrandForeground1Pressed: brand[100],
};

/** The theme for the system's appearance. */
export const fluentTheme = (dark: boolean) =>
  dark ? fluentDarkTheme : fluentLightTheme;
