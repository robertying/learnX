// Which palette the app's colors come from, by platform: Apple's system
// colors on iOS, iPadOS and Mac, Material's on Android. The Electron app's
// is in colors.web.ts, which Metro picks on web only, so the phones' bundles
// never carry it. The theme passes its own builders in.
import type { ThemeColors } from 'theme';
import { isApple } from 'helpers/platform';

type Builder = (dark: boolean) => ThemeColors;

export const buildPlatformColors = (
  dark: boolean,
  builders: { apple: Builder; material: Builder },
): ThemeColors => (isApple() ? builders.apple(dark) : builders.material(dark));
