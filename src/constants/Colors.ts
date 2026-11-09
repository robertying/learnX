import { DynamicColorIOS, Platform } from 'react-native';
import { brandColors } from 'theme';

/** The brand color in light mode, for places that take one fixed color. */
const plainTheme = brandColors.light;

/**
 * The brand color for the system appearance, for static styles. Inside
 * components, prefer `useTheme().colors.primary`.
 */
const theme =
  Platform.OS === 'ios'
    ? (DynamicColorIOS(brandColors) as unknown as string)
    : brandColors.light;

export default {
  plainTheme,
  theme,
};
